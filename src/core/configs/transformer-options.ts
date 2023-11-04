import { ClassTransformOptions } from 'class-transformer';

export const transformerOptions: ClassTransformOptions = {
    strategy: 'excludeAll',
    excludeExtraneousValues: true,
};
