import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-stylist-settings',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './stylist-settings.html',
  styleUrl: './stylist-settings.scss',
})
export class StylistSettingsComponent {
  @Input() businessName = '';
  @Input() about = '';
  @Input() specialties: string[] = [];
  @Input() photoUrl = '';
  @Input() initials = '';
  @Input() ownerName = '';
  @Output() readonly editRequested = new EventEmitter<void>();
}
