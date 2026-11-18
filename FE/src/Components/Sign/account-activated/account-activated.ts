import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

type Status = 'success' | 'already' | 'invalid' | 'notfound';

const TEXT: Record<Status, { title: string; body: string }> = {
  success: {
    title: 'Your account is activated',
    body: 'Welcome to Nour. The light is on for you now, log in and start shopping.',
  },
  already: {
    title: 'Your account is already active',
    body: 'The light was already on. Just log in and carry on shopping.',
  },
  invalid: {
    title: 'This link is invalid or expired',
    body: "We couldn't turn the light on with this link. Register again to get a new one, or log in if you already activated.",
  },
  notfound: {
    title: "We couldn't find this account",
    body: 'This link belongs to an account that no longer exists. You can register again.',
  },
};

/**
 * /account-activated?status=success|already|invalid|notfound
 * the backend's email link redirects here after it activates the account
 */
@Component({
  selector: 'app-account-activated',
  imports: [RouterLink],
  templateUrl: './account-activated.html',
  styleUrl: './account-activated.css',
})
export class AccountActivated implements OnDestroy {
  private route = inject(ActivatedRoute);

  status = signal<Status>(this.readStatus());
  ok = computed(() => this.status() === 'success' || this.status() === 'already');
  text = computed(() => TEXT[this.status()]);

  /** lamp is lit */
  on = signal(false);
  /** the message shows after the first switch-on (success) or right away (errors) */
  revealed = signal(!this.ok());
  /** errors: the bulb flickers and dies */
  flicker = signal(false);

  private timers: ReturnType<typeof setTimeout>[] = [];

  constructor() {
    // nobody touches the switch -> the light comes on by itself
    if (this.ok()) this.later(() => !this.on() && this.toggle(), 2600);
    // bad link -> try to turn on, flicker, stay dark
    else this.later(() => this.toggle(), 700);
  }

  toggle() {
    if (!this.ok()) {
      this.flicker.set(false);
      this.later(() => this.flicker.set(true), 0);
      this.later(() => this.flicker.set(false), 1300);
      return;
    }
    this.on.update((v) => !v);
    if (this.on()) this.later(() => this.revealed.set(true), 350);
  }

  ngOnDestroy() {
    this.timers.forEach(clearTimeout);
  }

  private later(fn: () => void, ms: number) {
    this.timers.push(setTimeout(fn, ms));
  }

  private readStatus(): Status {
    const s = this.route.snapshot.queryParamMap.get('status');
    return s && s in TEXT ? (s as Status) : 'success';
  }
}
