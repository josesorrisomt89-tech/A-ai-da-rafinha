import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-tutorial',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tutorial.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TutorialComponent {
  closeTutorial = output<void>();

  printTutorial() {
    window.print();
  }
}
