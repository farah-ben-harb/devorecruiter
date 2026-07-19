import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-not-found',
  imports: [RouterModule],
  templateUrl: './not-found.component.html',
  styles: ``,
})
export class NotFoundComponent {
  currentYear: number = new Date().getFullYear();
}
