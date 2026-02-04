
'use server';

/**
 * @fileOverview Action serveur pour l'envoi de notifications push via FCM.
 */

interface SendNotificationInput {
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

export async function sendPushNotification({ token, title, body, data }: SendNotificationInput) {
  if (!token) return { success: false, error: 'Token manquant' };

  try {
    // Note: Dans un environnement de production, l'authentification se fait via un compte de service.
    // Ici, nous préparons la structure pour une intégration robuste avec l'API v1 de FCM.
    // Pour le prototype, nous simulons l'appel réseau vers le endpoint FCM.
    
    console.log(`[Push Server] Envoi vers ${token}: ${title} - ${body}`);

    // Simulation d'un appel API robuste
    // En production réelle, vous utiliseriez un jeton OAuth2 généré à partir de vos secrets Firebase.
    const response = await fetch(`https://fcm.googleapis.com/fcm/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // 'Authorization': `key=VOTRE_CLE_SERVEUR_LEGACY_OU_JETON_V1`
      },
      body: JSON.stringify({
        to: token,
        notification: {
          title,
          body,
          click_action: "FLUTTER_NOTIFICATION_CLICK",
          icon: "stock_ticker_update"
        },
        data: data || {}
      })
    });

    return { success: true };
  } catch (error) {
    console.error('Erreur lors de l\'envoi de la notification:', error);
    return { success: false, error: 'Échec de la transmission' };
  }
}
