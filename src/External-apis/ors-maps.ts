import { Injectable, OnModuleInit } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { map } from 'rxjs/operators';

export class OrsRoutingError extends Error {
  constructor(
    message: string,
    public code: string,
    public coordinates?: { lat: number; lng: number }[]
  ) {
    super(message);
    this.name = 'OrsRoutingError';
  }
}

@Injectable()
export class OrsMapService implements OnModuleInit {
  private apiKey: string;
  private readonly apiUrl: string = 'https://api.openrouteservice.org';

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) {}

  onModuleInit() {
    const apiKey = this.configService.get<string>('ORS_API_KEY');
    if (!apiKey) {
      throw new Error('ORS_API_KEY is not defined in the environment variables');
    }
    this.apiKey = apiKey;
  }

  async getRouteInfo(start: string, end: string) {
    try {
      const [startLng, startLat] = start.split(',');
      const [endLng, endLat] = end.split(',');
      
      // Validate coordinates
      if (!this.isValidCoordinate(parseFloat(startLat), parseFloat(startLng)) ||
          !this.isValidCoordinate(parseFloat(endLat), parseFloat(endLng))) {
        throw new OrsRoutingError('Invalid coordinates provided', 'INVALID_COORDINATES');
      }

      const url = `${this.apiUrl}/v2/directions/driving-car`;
      const params = new URLSearchParams({
        api_key: this.apiKey,
        start: `${startLng},${startLat}`,
        end: `${endLng},${endLat}`,
      });
      
      console.log('Requesting route with URL:', `${url}?${params}`);
    
      const response = await fetch(`${url}?${params}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json, application/geo+json, application/gpx+xml, img/png; charset=utf-8',
        },
      });
    
      if (!response.ok) {
        const errorBody = await response.text();
        console.error('Route API error details:', errorBody);
        
        // Parse ORS specific error codes
        if (errorBody.includes('2010') || errorBody.includes('Could not find routable point')) {
          throw new OrsRoutingError(
            'No routable road found near the specified location. Please try a nearby address or main road.',
            'NO_ROUTABLE_POINT',
            [
              { lat: parseFloat(startLat), lng: parseFloat(startLng) },
              { lat: parseFloat(endLat), lng: parseFloat(endLng) }
            ]
          );
        }
        
        throw new OrsRoutingError(
          `Routing service error: ${response.statusText}`,
          'API_ERROR'
        );
      }
    
      const data = await response.json();
      
      if (!data.features || data.features.length === 0) {
        console.error('Route API returned no features:', data);
        throw new OrsRoutingError('No route found between the specified locations', 'NO_ROUTE');
      }
    
      const route = data.features[0];
      
      // Extract detailed instructions for drivers
      const instructions = this.extractInstructions(route);
      
      return {
        distance: route.properties.summary.distance,
        duration: route.properties.summary.duration,
        geometry: route.geometry,
        instructions: instructions,
        segments: route.properties.segments || []
      };
    } catch (error) {
      if (error instanceof OrsRoutingError) {
        throw error;
      }
      throw new OrsRoutingError('Failed to calculate route', 'UNKNOWN_ERROR');
    }
  }

  // Add fallback method using Haversine distance
  async getFallbackRouteInfo(startLat: number, startLng: number, endLat: number, endLng: number) {
    const distance = this.calculateDistance(startLat, startLng, endLat, endLng);
    const estimatedDuration = Math.round((distance / 30) * 60 * 60); // 30 km/h average speed
    
    return {
      distance: distance * 1000, // Convert to meters
      duration: estimatedDuration,
      geometry: null,
      instructions: [{
        distance: distance * 1000,
        duration: estimatedDuration,
        instruction: `Estimated route: ${distance.toFixed(1)} km, ~${Math.round(distance / 30 * 60)} min`,
        type: 0
      }],
      segments: [],
      isFallback: true
    };
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return distance;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private isValidCoordinate(lat: number, lng: number): boolean {
    return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  }

  private extractInstructions(route: any): Array<{
    distance: number;
    duration: number;
    instruction: string;
    type: number;
    name?: string;
  }> {
    if (!route.properties.segments || !route.properties.segments[0]) {
      return [];
    }

    const instructions: Array<{
      distance: number;
      duration: number;
      instruction: string;
      type: number;
      name?: string;
    }> = [];
    
    const segment = route.properties.segments[0];
    
    if (segment.steps) {
      for (const step of segment.steps) {
        instructions.push({
          distance: step.distance,
          duration: step.duration,
          instruction: step.instruction,
          type: step.type,
          name: step.name || undefined
        });
      }
    }
    
    return instructions;
  }

  async getRouteWithInstructions(startLat: number, startLng: number, endLat: number, endLng: number) {
    const start = `${startLng},${startLat}`;
    const end = `${endLng},${endLat}`;
    
    let routeData;
    try {
      routeData = await this.getRouteInfo(start, end);
    } catch (error) {
      if (error instanceof OrsRoutingError && error.code === 'NO_ROUTABLE_POINT') {
        console.warn('ORS routing failed, using fallback distance calculation');
        routeData = await this.getFallbackRouteInfo(startLat, startLng, endLat, endLng);
      } else {
        throw error;
      }
    }
    
    return {
      ...routeData,
      formattedInstructions: this.formatInstructionsForDriver(routeData.instructions)
    };
  }

  private formatInstructionsForDriver(instructions: any[]): string[] {
    return instructions.map((instruction, index) => {
      const distanceKm = (instruction.distance / 1000).toFixed(1);
      const durationMin = Math.round(instruction.duration / 60);
      
      return `${index + 1}. ${instruction.instruction} (${distanceKm}km, ~${durationMin}min)`;
    });
  }

  async getAutocompleteSuggestions(query: string) {
    const url = `${this.apiUrl}/geocode/autocomplete?api_key=${this.apiKey}&text=${encodeURIComponent(query)}`;
    console.log('Requesting autocomplete with query:', query);
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json, application/geo+json, application/gpx+xml, img/png; charset=utf-8',
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Autocomplete API error details:', errorBody);
      throw new Error('Autocomplete API error: ' + response.statusText);
    }

    const data = await response.json();
    console.log('Autocomplete API response data:', JSON.stringify(data));
    if (!data.features || data.features.length === 0) {
      console.warn('Autocomplete API returned no features:', data);
      return [];
    }

    return data.features.map((feature: any) => ({
      label: feature.properties.label,
      coordinates: feature.geometry.coordinates,
    }));
  }

  async getPlaceName(latitude: number, longitude: number): Promise<string | null> {
    try {
      const url = `${this.apiUrl}/geocode/reverse?api_key=${this.apiKey}&point.lon=${longitude}&point.lat=${latitude}`;
      const response = await this.httpService.get(url).toPromise();
      if (response && response.data && response.data.features && response.data.features.length > 0) {
        const feature = response.data.features[0];
        const properties = feature.properties;
        const name = properties.name;
        const street = properties.street;
        const locality = properties.locality;
        const region = properties.region;
        const postcode = properties.postalcode;
  
        let address = '';
        if (name) {
          address += name + ', ';
        }
        if (street) {
          address += street + ', ';
        }
        if (locality) {
          address += locality + ', ';
        }
        if (region) {
          address += region + ', ';
        }
        if (postcode) {
          address += postcode;
        }
  
        address = address.replace(/, $/, '');
  
        return address;
      } else {
        console.log("No place found or invalid response:", response);
        return null;
      }
    } catch (error) {
      console.error("Error fetching place name:", error);
      return null;
    }
  }
}
