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
const firebaseConfig = {
    apiKey: "AIzaSyAjWUJltQO3uHgsh5rBE3GqGP7AgU6BYVs",
    authDomain: "cardapio-acai-da-rafinha.firebaseapp.com",
    databaseURL: "https://cardapio-acai-da-rafinha-default-rtdb.firebaseio.com",
    projectId: "cardapio-acai-da-rafinha",
    storageBucket: "cardapio-acai-da-rafinha.firebasestorage.app",
    messagingSenderId: "1018377130538",
    appId: "1:1018377130538:web:5084d03b3285d8da05e953",
    measurementId: "G-9DXVJ9QXRB"
  };

/**
 * Verifica se a configuração do Firebase foi alterada do valor padrão.
 * @returns {boolean} True se a configuração parece ter sido preenchida.
 */
export const isFirebaseConfigured = (): boolean => {
    return FIREBASE_CONFIG.apiKey !== "AIzaSyAjWUJltQO3uHgsh5rBE3GqGP7AgU6BYVs" && FIREBASE_CONFIG.projectId !== "YOUR_PROJECT_ID";
}
