import {Component, NgZone, OnInit} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import * as L from 'leaflet';
import {GeoJSON} from 'leaflet';
import * as _ from 'lodash';
import {Subscription, timer} from 'rxjs';
import * as moment from 'moment';

interface Score {
  rightGuesses: number;
  wrongGuesses: number;
  totalAreas: number;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'read-geojson';

  pendingAreas: GeoJSON.Feature[] = [];
  currentArea: any;
  score: Score = {
    rightGuesses: 0,
    wrongGuesses: 0,
    totalAreas: undefined,
  };

  timerSubscription: Subscription;
  timerSeconds: string;

  wrongGuessesMapping: { [k: string]: string } = {'=0': '0 fallos', '=1': '1 fallo', other: '# fallos'};

  options = {
    // layers: [
    //   tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '...', opacity: 1 })
    // ],
    zoom: 3,
    minZoom: 2,
    attributionControl: false,
    center: L.latLng(47.482019, -1),
    // wrap: true,
  };

  constructor(private http: HttpClient, private ngZone: NgZone) {
  }

  ngOnInit() {
    const source = timer(0, 1000);
    this.timerSubscription = source.subscribe(s => this.timerSeconds = moment().startOf('day').add(s, 'seconds').format('mm:ss'));
  }

  onMapReady(map: L.Map) {

    const whenClicked = (e, feature: GeoJSON.Feature, layer) => {
      this.ngZone.run(() => {
        // FIXME set styles to cursor none
        if (_.indexOf(_.map(this.pendingAreas, 'ADMIN'), feature.properties.ADMIN) > -1) {
          if (feature.properties.ADMIN === this.currentArea.ADMIN) {
            this.onRightGuess(layer, this.currentArea.ADMIN);
          } else {
            this.onWrongGuess(layer);
          }
          this.getRandomArea();
        }
      });

    };

    const onEachFeature = (feature, layer) => {
      layer.on({
        click: e => whenClicked(e, feature, layer)
      });
    };

    this.http.get('assets/world.geojson').subscribe((json: GeoJSON.FeatureCollection) => {
      // L.vectorGrid.slicer( json, {
      //   rendererFactory: L.svg.tile,
      //   vectorTileLayerStyles: {
      //     sliced: function(properties, zoom) {
      //       var p = properties.mapcolor7 % 5;
      //       return {
      //         fillColor: p === 0 ? '#800026' :
      //           p === 1 ? '#E31A1C' :
      //             p === 2 ? '#FEB24C' :
      //               p === 3 ? '#B2FE4C' : '#FFEDA0',
      //         fillOpacity: 0.5,
      //         //fillOpacity: 1,
      //         stroke: true,
      //         fill: true,
      //         color: 'black',
      //         //opacity: 0.2,
      //         weight: 0,
      //       }
      //     }
      //   },
      //   interactive: true,
      //   getFeatureId: function(f) {
      //     return f.properties.wb_a3;
      //   }
      // }).addTo(map);
      L.geoJSON(json, {
        onEachFeature,
        style: {
          color: 'white',
          weight: 0.5,
        },
      }).addTo(map);

      json.features.forEach((f: any) => {
        this.pendingAreas.push(f.properties);
      });
      this.score.totalAreas = this.pendingAreas.length;
      this.getRandomArea();

    });

  }

  getRandomArea: () => void = () => {
    this.currentArea = this.pendingAreas[Math.floor(Math.random() * (this.pendingAreas.length))];
    if (!this.currentArea) {
      this.timerSubscription.unsubscribe();
    }
  };

  onRightGuess = (layer, id: string) => {
    // layer.getContainer().className += ' correct';
    layer.setStyle({fillColor: 'green', fillOpacity: 0.7, cursor: 'none'});
    _.remove(this.pendingAreas, ['ADMIN', id]);
    this.score.rightGuesses++;
  };

  onWrongGuess = (layer) => {
    layer.setStyle({fillColor: 'red', fillOpacity: 0.7});
    setTimeout(() => {
      layer.setStyle({fillColor: 'white', fillOpacity: 0.2});
    }, 1000);
    this.score.wrongGuesses++;

  };

}
