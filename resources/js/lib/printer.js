/**
 * Imprime un PDF sin abrir pestaña nueva: lo carga en un iframe oculto
 * y dispara el diálogo de impresión del navegador sobre ese documento.
 */
export function printPdf(url, { timeout = 15000 } = {}) {
    return new Promise((resolve, reject) => {
        const existing = document.getElementById('nexo-print-frame');
        if (existing) existing.remove();

        const iframe = document.createElement('iframe');
        iframe.id = 'nexo-print-frame';
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        iframe.style.visibility = 'hidden';

        let settled = false;

        const cleanup = () => {
            setTimeout(() => {
                const frame = document.getElementById('nexo-print-frame');
                if (frame) frame.remove();
            }, 60000);
        };

        const fail = (message) => {
            if (settled) return;
            settled = true;
            cleanup();
            reject(new Error(message));
        };

        const timer = setTimeout(
            () => fail('La impresión tardó demasiado. Verifica tu conexión e inténtalo de nuevo.'),
            timeout
        );

        iframe.onload = () => {
            clearTimeout(timer);
            if (settled) return;

            try {
                const win = iframe.contentWindow;
                if (!win) {
                    fail('No se pudo acceder al documento de impresión.');
                    return;
                }

                // Safari e iOS necesitan un instante extra para renderizar el PDF
                setTimeout(() => {
                    try {
                        win.focus();
                        win.print();
                        settled = true;
                        cleanup();
                        resolve();
                    } catch (e) {
                        fail('El navegador bloqueó la impresión. Revisa los permisos del sitio.');
                    }
                }, 350);
            } catch (e) {
                fail('No se pudo abrir el diálogo de impresión.');
            }
        };

        iframe.onerror = () => {
            clearTimeout(timer);
            fail('No se pudo cargar el comprobante. Verifica que la venta exista.');
        };

        iframe.src = url;
        document.body.appendChild(iframe);
    });
}