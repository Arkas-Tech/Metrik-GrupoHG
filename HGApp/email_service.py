import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

SMTP_HOST = os.getenv('SMTP_HOST', 'smtp.gmail.com')
SMTP_PORT = int(os.getenv('SMTP_PORT', '587'))
SMTP_USER = os.getenv('SMTP_USER')
SMTP_PASSWORD = os.getenv('SMTP_PASSWORD')
EMAIL_FROM = os.getenv('EMAIL_FROM')
EMAIL_FROM_NAME = os.getenv('EMAIL_FROM_NAME', 'SGPME Sistema')


def send_password_reset_email(to_email: str, reset_code: str) -> bool:
    """
    Envía un correo con el código de recuperación de contraseña
    """
    try:
        # Crear mensaje
        message = MIMEMultipart('alternative')
        message['Subject'] = 'Código de Recuperación de Contraseña - SGPME'
        message['From'] = f'{EMAIL_FROM_NAME} <{EMAIL_FROM}>'
        message['To'] = to_email

        # Contenido del email en texto plano
        text = f"""
Hola,

Has solicitado recuperar tu contraseña en el Sistema SGPME.

Tu código de verificación es: {reset_code}

Este código es válido por 15 minutos.

Si no solicitaste este código, puedes ignorar este mensaje.

Saludos,
Equipo SGPME
        """

        # Contenido del email en HTML
        html = f"""
        <html>
        <head>
            <style>
                body {{
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                }}
                .container {{
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                    background-color: #f9f9f9;
                    border-radius: 10px;
                }}
                .header {{
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 20px;
                    text-align: center;
                    border-radius: 10px 10px 0 0;
                }}
                .code-box {{
                    background-color: #fff;
                    border: 2px solid #667eea;
                    border-radius: 8px;
                    padding: 20px;
                    text-align: center;
                    margin: 20px 0;
                }}
                .code {{
                    font-size: 32px;
                    font-weight: bold;
                    letter-spacing: 8px;
                    color: #667eea;
                }}
                .warning {{
                    background-color: #fff3cd;
                    border-left: 4px solid #ffc107;
                    padding: 10px;
                    margin: 20px 0;
                }}
                .footer {{
                    text-align: center;
                    color: #666;
                    font-size: 12px;
                    margin-top: 20px;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>SGPME</h1>
                    <p>Sistema de Gestión de Presupuestos, Métricas y Eventos</p>
                </div>
                
                <div style="padding: 20px; background-color: white;">
                    <h2>Recuperación de Contraseña</h2>
                    <p>Hola,</p>
                    <p>Has solicitado recuperar tu contraseña. Usa el siguiente código de verificación:</p>
                    
                    <div class="code-box">
                        <div class="code">{reset_code}</div>
                    </div>
                    
                    <div class="warning">
                        <strong>⏰ Importante:</strong> Este código es válido por <strong>15 minutos</strong>.
                    </div>
                    
                    <p>Si no solicitaste este código, puedes ignorar este mensaje de forma segura.</p>
                </div>
                
                <div class="footer">
                    <p>Este es un correo automático, por favor no responder.</p>
                    <p>&copy; 2026 SGPME - Powered by Arkas Tech</p>
                </div>
            </div>
        </body>
        </html>
        """

        # Adjuntar ambas versiones
        part1 = MIMEText(text, 'plain')
        part2 = MIMEText(html, 'html')
        message.attach(part1)
        message.attach(part2)

        # Conectar y enviar dependiendo del puerto
        if SMTP_PORT == 465:
            # Puerto 465 requiere SSL directo
            with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT) as server:
                server.login(SMTP_USER, SMTP_PASSWORD)
                server.send_message(message)
        else:
            # Puerto 587 usa STARTTLS
            with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
                server.starttls()
                server.login(SMTP_USER, SMTP_PASSWORD)
                server.send_message(message)
        
        print(f"✓ Email enviado exitosamente a {to_email}")
        return True

    except Exception as e:
        print(f"✗ Error al enviar email: {str(e)}")
        return False


def send_test_email(to_email: str) -> bool:
    """
    Envía un correo de prueba para verificar la configuración
    """
    try:
        message = MIMEMultipart()
        message['Subject'] = 'Prueba de configuración - SGPME'
        message['From'] = f'{EMAIL_FROM_NAME} <{EMAIL_FROM}>'
        message['To'] = to_email

        body = "Este es un correo de prueba del sistema SGPME. La configuración funciona correctamente."
        message.attach(MIMEText(body, 'plain'))

        # Conectar dependiendo del puerto
        if SMTP_PORT == 465:
            with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT) as server:
                server.login(SMTP_USER, SMTP_PASSWORD)
                server.send_message(message)
        else:
            with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
                server.starttls()
                server.login(SMTP_USER, SMTP_PASSWORD)
                server.send_message(message)
        
        print(f"✓ Email de prueba enviado a {to_email}")
        return True

    except Exception as e:
        print(f"✗ Error: {str(e)}")
        return False
