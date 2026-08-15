<?php

namespace App\Services;

use App\Models\Product;
use App\Models\ProductStock;
use App\Models\StockMovement;
use App\Models\Warehouse;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class StockService
{
    /**
     * Tipos de movimiento que DISMINUYEN el stock del almacén.
     */
    private const OUTBOUND_TYPES = [
        'venta',
        'devolucion_compra',
        'merma',
        'ajuste_salida',
        'transferencia_salida',
    ];

    /**
     * Registra un movimiento de stock en un almacén específico.
     *
     * @param  int|null  $warehouseId  Si es null usa el almacén predeterminado.
     * @throws RuntimeException si un movimiento de salida deja el stock negativo.
     */
    public static function move(
        Product $product,
        string $type,
        float $quantity,
        ?string $referenceType = null,
        ?int $referenceId = null,
        ?string $notes = null,
        ?int $warehouseId = null,
        ?int $destinationWarehouseId = null,
    ): StockMovement {
        if ($quantity <= 0) {
            throw new RuntimeException('La cantidad del movimiento debe ser mayor a cero.');
        }

        $warehouseId ??= Warehouse::defaultId();

        return DB::transaction(function () use (
            $product, $type, $quantity, $referenceType, $referenceId,
            $notes, $warehouseId, $destinationWarehouseId
        ) {
            // Bloqueo pesimista sobre la fila de stock de ESE almacén.
            // Evita sobreventa cuando dos cajeros venden a la vez.
            $row = ProductStock::where('product_id', $product->id)
                ->where('warehouse_id', $warehouseId)
                ->lockForUpdate()
                ->first();

            if (!$row) {
                $row = ProductStock::create([
                    'product_id' => $product->id,
                    'warehouse_id' => $warehouseId,
                    'stock' => 0,
                    'min_stock' => $product->min_stock ?? 0,
                ]);
            }

            $stockBefore = (float) $row->stock;
            $isOutbound = in_array($type, self::OUTBOUND_TYPES, true);
            $stockAfter = $isOutbound ? $stockBefore - $quantity : $stockBefore + $quantity;

            if ($stockAfter < -0.0001) {
                $warehouseName = Warehouse::find($warehouseId)?->name ?? 'almacén';
                throw new RuntimeException(
                    "Stock insuficiente de \"{$product->name}\" en {$warehouseName}: disponible {$stockBefore}, solicitado {$quantity}."
                );
            }

            $row->update(['stock' => $stockAfter]);

            // products.stock se mantiene como caché del total consolidado,
            // para que Dashboard y Reportes sigan funcionando sin recalcular.
            self::syncTotalStock($product);

            return StockMovement::create([
                'product_id' => $product->id,
                'warehouse_id' => $warehouseId,
                'destination_warehouse_id' => $destinationWarehouseId,
                'type' => $type,
                'quantity' => $quantity,
                'stock_before' => $stockBefore,
                'stock_after' => $stockAfter,
                'reference_type' => $referenceType,
                'reference_id' => $referenceId,
                'user_id' => auth()->id(),
                'notes' => $notes,
            ]);
        });
    }

    /**
     * Traslada stock entre dos almacenes generando ambos movimientos
     * de forma atómica: si falla la entrada, se revierte la salida.
     *
     * @return array{out: StockMovement, in: StockMovement}
     */
    public static function transfer(
        Product $product,
        float $quantity,
        int $fromWarehouseId,
        int $toWarehouseId,
        ?string $referenceType = null,
        ?int $referenceId = null,
        ?string $notes = null,
    ): array {
        if ($fromWarehouseId === $toWarehouseId) {
            throw new RuntimeException('El almacén de origen y destino no pueden ser el mismo.');
        }

        return DB::transaction(function () use (
            $product, $quantity, $fromWarehouseId, $toWarehouseId,
            $referenceType, $referenceId, $notes
        ) {
            $out = self::move(
                product: $product,
                type: 'transferencia_salida',
                quantity: $quantity,
                referenceType: $referenceType,
                referenceId: $referenceId,
                notes: $notes,
                warehouseId: $fromWarehouseId,
                destinationWarehouseId: $toWarehouseId,
            );

            $in = self::move(
                product: $product,
                type: 'transferencia_entrada',
                quantity: $quantity,
                referenceType: $referenceType,
                referenceId: $referenceId,
                notes: $notes,
                warehouseId: $toWarehouseId,
                destinationWarehouseId: $fromWarehouseId,
            );

            return ['out' => $out, 'in' => $in];
        });
    }

    /**
     * Recalcula products.stock como la suma de todos los almacenes.
     */
    public static function syncTotalStock(Product $product): void
    {
        $total = (float) ProductStock::where('product_id', $product->id)->sum('stock');
        $product->updateQuietly(['stock' => $total]);
    }
}