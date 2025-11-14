/**
 * INSTRUÇÕES:
 * 1. Siga o tutorial na seção "Ajuda e Tutorial" do seu Painel Admin para criar um projeto no Firebase.
 * 2. Na etapa 3 do tutorial do Firebase, você obterá um objeto de configuração `firebaseConfig`.
 * 3. Copie as chaves e valores desse objeto e cole-os aqui, substituindo os valores de exemplo.
 * 
 * Exemplo:
 *   apiKey: "AIzaSyDEF...-123",
 *   authDomain: "meu-acai-12345.firebaseapp.com",
 *   ...
 */
export const FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT_ID.firebaseio.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

/**
 * Verifica se a configuração do Firebase foi alterada do valor padrão.
 * @returns {boolean} True se a configuração parece ter sido preenchida.
 */
export const isFirebaseConfigured = (): boolean => {
    return FIREBASE_CONFIG.apiKey !== "YOUR_API_KEY" && FIREBASE_CONFIG.projectId !== "YOUR_PROJECT_ID";
}
