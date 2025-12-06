import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ListagoPage } from './listago.page';

describe('ListagoPage', () => {
  let component: ListagoPage;
  let fixture: ComponentFixture<ListagoPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ListagoPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
