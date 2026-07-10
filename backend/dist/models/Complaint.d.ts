import { Document } from 'mongoose';
export interface IComplaint extends Document {
    id?: string;
    title: string;
    description: string;
    category: string;
    location: string;
    status: string;
    createdAt: Date | string;
    lat?: number;
    lng?: number;
    aiSuggestion?: any;
}
declare const Complaint: import("mongoose").Model<IComplaint, {}, {}, {}, Document<unknown, {}, IComplaint, {}, import("mongoose").DefaultSchemaOptions> & IComplaint & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IComplaint>;
export default Complaint;
