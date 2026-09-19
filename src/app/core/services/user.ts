import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { UserProfile, UsersApiResponse } from '../../models/user';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private http = inject(HttpClient);
  private readonly apiUrl = 'https://dummyjson.com/users';

  getUsersTotal(): Observable<number> {
    return this.http
      .get<UsersApiResponse>(`${this.apiUrl}?limit=1`)
      .pipe(map((res) => res.total));
  }

  getUsers(limit = 10, skip = 0): Observable<UsersApiResponse> {
    return this.http.get<UsersApiResponse>(`${this.apiUrl}?limit=${limit}&skip=${skip}`);
  }

  getUserProfile(id: number): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.apiUrl}/${id}`).pipe(
      shareReplay({
        bufferSize: 1,
        refCount: true,
      })
    );
  }

  updateUserProfile(id: number, profile: Partial<UserProfile>): Observable<UserProfile> {
    return this.http.put<UserProfile>(`${this.apiUrl}/${id}`, profile);
  }
}

