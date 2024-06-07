import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GeoFencingPage } from './geo-fencing.page';

describe('GeoFencingPage', () => {
  let component: GeoFencingPage;
  let fixture: ComponentFixture<GeoFencingPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(GeoFencingPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
