
// Standard Firebase v9 modular imports
import { initializeApp } from 'firebase/app';
import { initializeFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// الإعدادات الجديدة المقدمة من قبل المستخدم
const firebaseConfig = {
    apiKey: "AIzaSyC6jaJoEtdxOnnmVbk5HjWiuH9M_yWzrTk",
    authDomain: "bobo-live-bce54.firebaseapp.com",
    projectId: "bobo-live-bce54",
    storageBucket: "bobo-live-bce54.firebasestorage.app",
    messagingSenderId: "386288883998",
    appId: "1:386288883998:web:ce7c14d37dd7371552110f"
};

/**
 * Fix: Sometimes the named export 'initializeApp' is reported missing from 'firebase/app' 
 * if the environment resolves to an older version or compatibility layer. 
 * Re-asserting the modular v9 initialization.
 */
const app = initializeApp(firebaseConfig);

/**
 * إعدادات Firestore المتقدمة لضمان استقرار الاتصال
 */
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});

export const auth = getAuth(app);
