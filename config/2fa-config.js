/**
 * 2FA Email Configuration
 * Para implementação futura em produção
 */

const nodemailer = require('nodemailer');

class TwoFactorAuth {
    constructor() {
        this.transporter = null;
        this.initializeTransporter();
    }

    initializeTransporter() {
        // Configuração para Outlook/Hotmail
        this.transporter = nodemailer.createTransporter({
            host: 'smtp-mail.outlook.com',
            port: 587,
            secure: false,
            auth: {
                user: process.env.ADMIN_EMAIL || 'rafaelcannalonga2@hotmail.com',
                pass: process.env.EMAIL_PASSWORD || 'senha_do_email_aqui'
            }
        });
    }

    async sendLoginNotification(userEmail, loginDetails) {
        const mailOptions = {
            from: process.env.ADMIN_EMAIL,
            to: userEmail,
            subject: '🔐 Acesso Admin - MPP Converter',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #3b82f6;">🛡️ Notificação de Acesso Admin</h2>
                    
                    <p>Olá <strong>Alcap0ne</strong>,</p>
                    
                    <p>Um novo login foi realizado no painel administrativo do MPP Converter.</p>
                    
                    <div style="background: #f8fafc; padding: 1rem; border-radius: 8px; margin: 1rem 0;">
                        <h3 style="color: #374151; margin: 0 0 0.5rem 0;">Detalhes do Login:</h3>
                        <p><strong>Data/Hora:</strong> ${loginDetails.timestamp}</p>
                        <p><strong>IP:</strong> ${loginDetails.ip || 'localhost'}</p>
                        <p><strong>User-Agent:</strong> ${loginDetails.userAgent || 'N/A'}</p>
                    </div>
                    
                    <p style="color: #10b981;"><strong>✅ Login autorizado com sucesso!</strong></p>
                    
                    <p>Se você não fez este login, entre em contato imediatamente.</p>
                    
                    <hr style="border: 1px solid #e5e7eb; margin: 2rem 0;">
                    
                    <p style="color: #6b7280; font-size: 0.875rem;">
                        Esta é uma mensagem automática do sistema MPP Converter.<br>
                        Sistema de segurança 2FA ativo.
                    </p>
                </div>
            `
        };

        try {
            await this.transporter.sendMail(mailOptions);
            console.log('📧 Notificação 2FA enviada para:', userEmail);
            return true;
        } catch (error) {
            console.error('❌ Erro ao enviar email 2FA:', error);
            return false;
        }
    }

    async sendSecurityAlert(userEmail, alertType, details) {
        const mailOptions = {
            from: process.env.ADMIN_EMAIL,
            to: userEmail,
            subject: '⚠️ Alerta de Segurança - MPP Converter',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #ef4444;">⚠️ Alerta de Segurança</h2>
                    
                    <p>Olá <strong>Alcap0ne</strong>,</p>
                    
                    <p>Detectamos uma atividade suspeita em seu sistema MPP Converter.</p>
                    
                    <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 1rem; border-radius: 8px; margin: 1rem 0;">
                        <h3 style="color: #dc2626; margin: 0 0 0.5rem 0;">Tipo de Alerta: ${alertType}</h3>
                        <p><strong>Detalhes:</strong> ${details}</p>
                        <p><strong>Data/Hora:</strong> ${new Date().toLocaleString('pt-BR')}</p>
                    </div>
                    
                    <p>Recomendamos que verifique imediatamente o painel administrativo.</p>
                    
                    <p style="color: #6b7280; font-size: 0.875rem;">
                        Sistema de monitoramento automático ativo.
                    </p>
                </div>
            `
        };

        try {
            await this.transporter.sendMail(mailOptions);
            console.log('🚨 Alerta de segurança enviado para:', userEmail);
            return true;
        } catch (error) {
            console.error('❌ Erro ao enviar alerta:', error);
            return false;
        }
    }
}

module.exports = TwoFactorAuth;

// Uso no servidor:
// const TwoFactorAuth = require('./2fa-config');
// const twoFA = new TwoFactorAuth();
// 
// // No login bem-sucedido:
// await twoFA.sendLoginNotification(ADMIN_EMAIL, {
//     timestamp: new Date().toLocaleString('pt-BR'),
//     ip: req.ip,
//     userAgent: req.get('User-Agent')
// });