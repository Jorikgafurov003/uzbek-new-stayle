import admin from "firebase-admin";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class FirebaseService {
  private static instance: FirebaseService;
  private isInitialized: boolean = false;

  private constructor() {
    this.initialize();
  }

  public static getInstance(): FirebaseService {
    if (!FirebaseService.instance) {
      FirebaseService.instance = new FirebaseService();
    }
    return FirebaseService.instance;
  }

  private initialize() {
    try {
      // The service account key file should be placed in the backend's config directory
      // or at least in a secure location.
      const serviceAccountPath = path.join(__dirname, "../../config/firebase-service-account.json");

      if (fs.existsSync(serviceAccountPath)) {
        const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf-8"));
        
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
        
        this.isInitialized = true;
        console.log("Firebase Admin SDK initialized successfully.");
      } else {
        console.warn("Firebase service account file not found at:", serviceAccountPath);
        console.warn("Firebase features will be disabled until the service account is configured.");
      }
    } catch (error) {
      console.error("Error initializing Firebase Admin SDK:", error);
    }
  }

  public getAdmin() {
    return admin;
  }

  public async sendPushNotification(token: string, title: string, body: string, data?: any) {
    if (!this.isInitialized) {
      console.error("Push notification failed: Firebase not initialized.");
      return;
    }

    try {
      const message = {
        notification: { title, body },
        data: data || {},
        token: token
      };

      const response = await admin.messaging().send(message);
      console.log("Push notification sent successfully:", response);
      return response;
    } catch (error) {
      console.error("Error sending push notification:", error);
      throw error;
    }
  }
}
