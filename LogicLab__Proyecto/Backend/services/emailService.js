const nodemailer = require("nodemailer");

// Las credenciales van en Backend/.env (nunca en el código):
//   EMAIL_USER=tu_correo@gmail.com
//   EMAIL_PASS=contraseña_de_aplicacion_de_16_caracteres
// Con Gmail NO sirve la contraseña normal de la cuenta: hay que activar la
// verificación en dos pasos y generar una "Contraseña de aplicación".
let transporter = null;

const getTransporter = () => {
    const { EMAIL_USER, EMAIL_PASS } = process.env;
    if (!EMAIL_USER || !EMAIL_PASS) return null;

    if (!transporter) {
        transporter = nodemailer.createTransport({
            service: "gmail",
            auth: { user: EMAIL_USER, pass: EMAIL_PASS }
        });
    }
    return transporter;
};

const escapar = (texto) =>
    String(texto).replace(/[&<>"']/g, (c) => (
        { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
    ));

const EmailService = {

    enviarCodigoRecuperacion: async (destino, nombre, codigo, minutos) => {
        const transport = getTransporter();

        if (!transport) {
            // Sin credenciales: en desarrollo el código se imprime en la
            // consola del backend para poder probar el flujo sin correo.
            if (process.env.NODE_ENV === "production")
                throw new Error("Correo no configurado (faltan EMAIL_USER / EMAIL_PASS)");

            console.warn(`[DEV] EMAIL_USER/EMAIL_PASS no configurados. Código para ${destino}: ${codigo}`);
            return;
        }

        await transport.sendMail({
            from: `"Restaurante Mangata" <${process.env.EMAIL_USER}>`,
            to: destino,
            subject: "Código para restablecer tu contraseña - Mangata",
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 420px; margin: 0 auto; padding: 24px; border: 1px solid #eee; border-radius: 12px;">
                    <h2 style="margin: 0 0 12px; color: #ff2c4f;">Mangata</h2>
                    <p>Hola ${escapar(nombre)},</p>
                    <p>Usa este código para restablecer tu contraseña:</p>
                    <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; margin: 24px 0;">${escapar(codigo)}</p>
                    <p style="color: #666; font-size: 13px;">El código vence en ${minutos} minutos. Si no lo solicitaste, ignora este mensaje: tu contraseña no cambiará.</p>
                </div>
            `
        });
    }
};

module.exports = EmailService;
