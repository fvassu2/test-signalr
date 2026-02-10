import { Component } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, CommonModule],
  template: `
    <nav class="top-nav">
      <a routerLink="/tablet" class="nav-link">📱 Tablet</a>
      <a routerLink="/manager" class="nav-link">🖥️ Manager</a>
    </nav>
    <main>
      <router-outlet />
    </main>
  `,
  styles: [`
    .top-nav {
      display: flex;
      gap: 20px;
      padding: 15px 20px;
      background: #1565C0;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .nav-link {
      color: white;
      text-decoration: none;
      font-weight: 600;
      padding: 8px 16px;
      border-radius: 4px;
      transition: background 0.2s;
    }
    .nav-link:hover {
      background: rgba(255,255,255,0.1);
    }
    main {
      min-height: calc(100vh - 60px);
      background: #f5f5f5;
    }
  `]
})
export class App { }
