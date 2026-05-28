import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { delay, Observable, of } from "rxjs";
import { TChatResponse } from "./app.models";

@Injectable()
export class AppService {
    constructor(private http: HttpClient) { }

    public getChatResponse(query: string): Observable<TChatResponse> {
        return this.http.post<TChatResponse>('http://localhost:3000/search', { query });
    }
}
