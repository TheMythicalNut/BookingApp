import { Component, computed, effect, inject, Signal, signal } from '@angular/core';
import { UtilityProvider } from '../../services/utility/utility-provider';
import { RequestState } from '../../models/models';
import { TextField } from "../../components/common/text-field/text-field";
import { Button } from "../../components/common/button/button";
import { TextArea } from "../../components/common/text-area/text-area";
import { UserProvider } from '../../services/user/user';
import { RequestStatusMessage } from "../../components/common/request-status-message/request-status-message";


interface SelectResult {
  type: 'select';
  columns: string[];
  rows: Record<string, unknown>[];
}

interface InsertResult {
  type: 'insert';
  rows: Record<string, unknown>[];
}

interface DeleteResult {
  type: 'delete';
  rows: Record<string, unknown>[];
}

interface UpdateChange {
  before: unknown;
  after: unknown;
}

interface UpdateRow {
  id?: unknown;
  changes: Record<string, UpdateChange>;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  diffWarning?: string;
}

interface UpdateResult {
  type: 'update';
  rows: UpdateRow[];
}

export type AdminQueryResult =
  | SelectResult
  | InsertResult
  | DeleteResult
  | UpdateResult;

@Component({
  selector: 'app-admin',
  imports: [Button, TextArea, RequestStatusMessage],
  templateUrl: './admin.html',
  styleUrl: './admin.css',
})
export class Admin {
  private readonly utility = inject(UtilityProvider);
  private readonly user = inject(UserProvider);
  readonly password = signal<string>('');
  readonly request = signal<string>('');

  readonly requestState = signal<RequestState<AdminQueryResult | string>>({status: 'idle'});
  readonly requestStatus = computed(() => this.requestState().status);

  private readonly _hasAccess = signal<boolean>(false);
  readonly hasAccess: Signal<boolean> = this._hasAccess.asReadonly();


  readonly queryResult = signal<AdminQueryResult | undefined>(undefined);
  readonly executionTimeMs = signal<number | undefined>(undefined);

  constructor(){
    this.user.isAdmin().subscribe({
      next: (value) => {
        if(value.status === 'success'){
          this._hasAccess.set(value.data);
          return;
        }
        else this._hasAccess.set(false);
      },
      error: (err) => {
        console.error(err);
        this._hasAccess.set(false);
        return;
      }
    });
  }

  login(){
    const password = this.password();
    this.utility.adminLogin(password).subscribe({
      next: (value)=> {
        this.requestState.set(value);
        if(value.status === 'success'){
          this._hasAccess.set(true);
        }
      },
      error: (err)=>{ this.requestState.set({status: 'error', error: 'unknown error'})}
    })
  }

  makeRequest(){
    const request = this.request();
    this.utility.adminRequest(request).subscribe({
      next: (value)=> {
        this.requestState.set(value);
        if(value.status === 'success'){
          this.queryResult.set(value.data);
        }
      },
      error: (err)=>{ this.requestState.set({status: 'error', error: 'unknown error'})}
    })
  }

  readonly getRowCount = computed(() => {
    const r = this.queryResult();
    if (!r) return 0;
    return r.rows.length;
  });

  readonly getInsertColumns = computed<string[]>(() => {
    const qr = this.queryResult();
    if(!qr) return [];
    const r = this.asInsert(qr);
    return r.rows.length ? Object.keys(r.rows[0]) : [];
  });

  readonly getDeleteColumns = computed<string[]>(() => {
    const qr = this.queryResult();
    if(!qr) return [];
    const r = this.asDelete(qr);
    return r.rows.length ? Object.keys(r.rows[0]) : [];
  });

  clearResult() {
    this.queryResult.set(undefined);
    this.executionTimeMs.set(undefined);
  }
  
  objectKeys = Object.keys;
  asSelect(r: AdminQueryResult) { return r as SelectResult; }
  asInsert(r: AdminQueryResult) { return r as InsertResult; }
  asDelete(r: AdminQueryResult) { return r as DeleteResult; }
  asUpdate(r: AdminQueryResult) { return r as UpdateResult; }
}
