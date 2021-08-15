import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/core/auth/auth.module';
import { FormationModel } from './infrastructure/models/formation.model';
import { FormationQuery } from './infrastructure/queries/formation.query';

@Module({
    imports: [TypeOrmModule.forFeature([FormationModel]), AuthModule],
    exports: [FormationQuery],
    providers: [FormationQuery],
})
export class FormationLibsModule {}
