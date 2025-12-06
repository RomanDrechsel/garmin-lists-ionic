import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { ListagoComponent } from './listago.component';

describe('ListagoComponent', () => {
  let component: ListagoComponent;
  let fixture: ComponentFixture<ListagoComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [ListagoComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ListagoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
