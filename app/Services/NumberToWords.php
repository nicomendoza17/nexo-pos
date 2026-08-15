<?php

namespace App\Services;

class NumberToWords
{
    private const UNITS = ['', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE',
        'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE',
        'VEINTE', 'VEINTIUNO', 'VEINTIDÓS', 'VEINTITRÉS', 'VEINTICUATRO', 'VEINTICINCO', 'VEINTISÉIS',
        'VEINTISIETE', 'VEINTIOCHO', 'VEINTINUEVE'];

    private const TENS = ['', '', '', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];

    private const HUNDREDS = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS',
        'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

    public static function currency(float $amount, string $currencyName = 'SOLES'): string
    {
        $integer = (int) floor($amount);
        $cents = (int) round(($amount - $integer) * 100);

        return 'SON: ' . self::convert($integer) . ' CON ' . str_pad($cents, 2, '0', STR_PAD_LEFT) . '/100 ' . $currencyName;
    }

    private static function convert(int $n): string
    {
        if ($n === 0) return 'CERO';
        if ($n === 100) return 'CIEN';

        if ($n < 30) return self::UNITS[$n];

        if ($n < 100) {
            $t = intdiv($n, 10);
            $u = $n % 10;
            return self::TENS[$t] . ($u ? ' Y ' . self::UNITS[$u] : '');
        }

        if ($n < 1000) {
            $h = intdiv($n, 100);
            $r = $n % 100;
            return self::HUNDREDS[$h] . ($r ? ' ' . self::convert($r) : '');
        }

        if ($n < 1000000) {
            $th = intdiv($n, 1000);
            $r = $n % 1000;
            $prefix = $th === 1 ? 'MIL' : self::convert($th) . ' MIL';
            return $prefix . ($r ? ' ' . self::convert($r) : '');
        }

        $mi = intdiv($n, 1000000);
        $r = $n % 1000000;
        $prefix = $mi === 1 ? 'UN MILLÓN' : self::convert($mi) . ' MILLONES';
        return $prefix . ($r ? ' ' . self::convert($r) : '');
    }
}