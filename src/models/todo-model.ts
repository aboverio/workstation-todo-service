import { Schema, model, Model } from 'mongoose';

const TodoSchema: Schema = new Schema({
  username: {
    type: String,
    required: [true, 'Todo has to have username!']
  },
  name: {
    type: String,
    required: [true, 'Todo name cannot be empty!']
  },
  dueDate: {
    type: Date
  }
});

TodoSchema.pre('save', function (this: ITodoModel, next: any) {
  this.createdAt = new Date();
  next();
});

TodoSchema.pre('update', function (this: ITodoModel, next: any) {
  this.updatedAt = new Date();
  next();
})

const Todo: Model <ITodoModel> = model<ITodoModel>('Todo', TodoSchema);

export default Todo;