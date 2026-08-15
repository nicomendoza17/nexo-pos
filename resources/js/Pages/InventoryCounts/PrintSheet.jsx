import { Head } from '@inertiajs/react';
import { useEffect } from 'react';

export default function PrintSheet({ products, category }) {
    useEffect(() => {
        window.print();
    }, []);

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <Head title="Hoja de conteo - NEXO POS" />

            <div className="flex justify-between items-center mb-6 print:mb-4">
                <div>
                    <h1 className="text-xl font-bold">Hoja de conteo de inventario</h1>
                    <p className="text-sm text-gray-500">{new Date().toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                </div>
                <div className="text-right text-sm text-gray-500">
                    <div>Contado por: ___________________</div>
                    <div className="mt-1">Firma: ___________________</div>
                </div>
            </div>

            <table className="w-full text-sm border-collapse">
                <thead>
                    <tr className="border-b-2 border-black">
                        <th className="text-left py-2">Producto</th>
                        <th className="text-left py-2">Código</th>
                        <th className="text-right py-2">Cant. contada</th>
                    </tr>
                </thead>
                <tbody>
                    {products.map((p) => (
                        <tr key={p.id} className="border-b border-gray-300">
                            <td className="py-2.5">{p.name}</td>
                            <td className="py-2.5 text-gray-500">{p.barcode || '—'}</td>
                            <td className="py-2.5 text-right w-32 border-b border-gray-400">&nbsp;</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <p className="text-xs text-gray-400 mt-6 print:hidden">
                Esta ventana se envió a imprimir automáticamente. Puedes cerrarla después.
            </p>
        </div>
    );
}