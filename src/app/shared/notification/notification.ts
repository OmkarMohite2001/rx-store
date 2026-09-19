import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { NotificationService } from '../../core/services/notification';

@Component({
  selector: 'app-notification',
  imports: [AsyncPipe, MatIconModule, MatButtonModule],
  templateUrl: './notification.html',
  styleUrl: './notification.scss',
})
export class NotificationComponent {
  protected notificationService = inject(NotificationService);
  notifications$ = this.notificationService.notificationsHistory$;
}

