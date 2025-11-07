import { Injectable, signal, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private platformId = inject(PLATFORM_ID);
  private originalTitle = 'Açaí da Rafinha';
  private notificationSound: HTMLAudioElement;
  private intervalId: any;
  private isFlashing = false;

  newOrderAlert = signal<boolean>(false);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.originalTitle = document.title;
      this.notificationSound = new Audio('https://cdn.jsdelivr.net/npm/ion-sound/sounds/bell_ring.mp3');
      this.notificationSound.loop = true;
      window.addEventListener('focus', () => this.clearTitleNotification());
    }
  }

  notifyNewOrder() {
    if (!isPlatformBrowser(this.platformId)) return;

    this.newOrderAlert.set(true);
    this.notificationSound.play().catch(error => console.error("Audio playback failed:", error));
    
    if (document.hidden) {
      this.startTitleFlashing();
    }
  }

  stopNewOrderSound() {
    if (!isPlatformBrowser(this.platformId) || !this.notificationSound) return;
    this.notificationSound.pause();
    this.notificationSound.currentTime = 0;
  }

  clearVisualNotification() {
    if (!isPlatformBrowser(this.platformId)) return;
    
    this.newOrderAlert.set(false);
    this.stopTitleFlashing();
  }
  
  private clearTitleNotification() {
    this.stopTitleFlashing();
  }

  private startTitleFlashing() {
    if (this.isFlashing) return;
    this.isFlashing = true;
    let isOriginalTitle = true;
    this.intervalId = setInterval(() => {
      document.title = isOriginalTitle ? '🔔 NOVO PEDIDO! 🔔' : this.originalTitle;
      isOriginalTitle = !isOriginalTitle;
    }, 1000);
  }

  private stopTitleFlashing() {
    if (!this.isFlashing) return;
    clearInterval(this.intervalId);
    document.title = this.originalTitle;
    this.isFlashing = false;
  }
}
