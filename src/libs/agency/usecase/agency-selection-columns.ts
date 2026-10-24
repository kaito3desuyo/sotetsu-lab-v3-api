import { columnsOf } from '../../../core/utils/selection/selection-tree.js';

/** `fields[agency]` で選べる列（docs/adr/0010-v3-include-and-fields.md） */
export const AGENCY_COLUMNS = columnsOf(
    'id',
    'agencyNumber',
    'parentAgencyNumber',
    'agencyOfficialName',
    'agencyName',
    'agencyType',
    'agencyUrl',
    'agencyPhone',
    'agencyFareUrl',
    'createdAt',
    'updatedAt',
);
