import { Controller, Get } from "@nestjs/common";
import { TripService } from "./trip.service";

@Controller()
export class TripController {

    constructor(private tripService: TripService) { }

    @Get()
    async getTrips(): Promise<any> {
        const trips = await this.tripService.findAll({
            relations: ['times'],
            where: {
                trip_number: '9402',
            }
        })
        return trips
    }
}