import { CommonModule } from '@angular/common';
import { Component, ElementRef, inject, OnDestroy, signal, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TChatResponse, TMessage } from './app.models';
import { AppService } from './app.service';
import { finalize, Subscription, take } from 'rxjs';

@Component({
    selector: 'app-root',
    imports: [FormsModule, CommonModule],
    providers: [AppService],
    templateUrl: './app.html',
    styleUrl: './app.css'
})
export class App implements OnDestroy {
    public message = '';
    public loading = signal<boolean>(false);
    public messages = signal<TMessage[]>([]);

    private appService = inject(AppService);
    private subscriptions = new Subscription();

    @ViewChild('chatWindow') private chatWindow!: ElementRef<HTMLDivElement>;

    ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
    }

    public sendMessage(): void {
        if (this.loading() || this.message === '') return;

        this.loading.set(true);
        this.updateMessages({
            sender: 'user',
            text: this.message,
            sources: [],
        });

        const requestStartTime: number = new Date().getTime();
        const chatSub = this.appService.getChatResponse(this.message)
            .pipe(
                take(1),
                finalize(() => this.loading.set(false))
            )
            .subscribe({
                next: (res: TChatResponse) => {
                    this.updateMessages({
                        sender: 'ai',
                        text: res.answer,
                        sources: res.sources,
                        timeElapsed: (new Date().getTime() - requestStartTime) / 1000,
                    });
                },
                complete: () => (this.message = ''),
                error: (err: any) => {
                    console.error(err);
                    this.updateMessages({
                        sender: 'ai',
                        text: 'Sorry I could not answer at this time, please try again.',
                        sources: [],
                    });
                }
            });

        this.subscriptions.add(chatSub);
    }

    private updateMessages(newMessage: TMessage): void {
        this.messages.update((messages: TMessage[]) => {
            messages.push(newMessage);
            return messages;
        });

        this.scrollToBottom();
    }

    private scrollToBottom(): void {
        setTimeout(() => this.chatWindow.nativeElement.scrollTo({
            top: this.chatWindow.nativeElement.scrollHeight,
            behavior: 'smooth',
        }), 100);
    }

    public getOriginFromUrl(url: string): string {
        try {
            return new URL(url).origin;
        } catch {
            return '<Broken URL>';
        }
    }
}
