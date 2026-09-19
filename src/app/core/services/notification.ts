import { inject, Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, Subject } from 'rxjs';
import { map, scan, shareReplay, tap } from 'rxjs/operators';
import { AppNotification } from '../../models/notification';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private snackBar = inject(MatSnackBar);
  private notificationSubject = new Subject<AppNotification>();

  readonly notification$: Observable<AppNotification> = this.notificationSubject.asObservable();

  readonly notificationsHistory$: Observable<AppNotification[]> = this.notification$.pipe(
    scan((acc: AppNotification[], curr: AppNotification) => [curr, ...acc].slice(0, 10), []),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  constructor() {
    this.notification$.pipe(
      tap((notification) => {
        const panelClass = `snackbar-${notification.type}`;
        this.snackBar.open(notification.message, 'Close', {
          duration: 3500,
          horizontalPosition: 'right',
          verticalPosition: 'bottom',
          panelClass: [panelClass],
        });
      })
    ).subscribe();
  }

  show(type: 'success' | 'error' | 'info' | 'warning', message: string): void {
    const notification: AppNotification = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type,
      message,
      timestamp: Date.now(),
    };
    this.notificationSubject.next(notification);
  }

  success(message: string): void {
    this.show('success', message);
  }

  error(message: string): void {
    this.show('error', message);
  }

  info(message: string): void {
    this.show('info', message);
  }

  warning(message: string): void {
    this.show('warning', message);
  }
}

