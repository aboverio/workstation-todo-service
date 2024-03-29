import { Request, Response, NextFunction } from 'express';
import { Types, FilterQuery } from 'mongoose';
import createError from 'http-errors';
import moment from 'moment';
import update from 'immutability-helper';

// Types
import { ICustomRequest } from '@/types';
import {
  ITodo,
  ITodoDocument,
  IAddTodoFormValidations,
  IAddTodoFormData,
  IUpdateTodoFormValidations,
  IUpdateTodoFormData,
  IGetAllTodosOptions,
  TodoPriority,
} from '@/types/todo';

// Models
import { Todo } from '@/models';

// Utils
import { TodoValidator } from '@/utils/validator';

export default class TodoController {
  public static async GetAllTodos(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      let conditions: FilterQuery<ITodoDocument> = {
        completed: false,
        due: moment().toDate(),
      };

      const options: IGetAllTodosOptions = {
        listId: (req.query.listId as string) || null,
        due: (req.query.due as string) || 'all',
      };

      // List ID Options
      if (options.listId) {
        if (Types.ObjectId.isValid(options.listId)) {
          conditions = update(conditions, {
            listId: {
              $set: new Types.ObjectId(options.listId),
            },
          });
        } else {
          throw createError(400, {
            message: 'Invalid list ID!',
          });
        }
      }

      // Due Option
      if (options.due === 'all') {
        conditions = update(conditions, {
          $unset: ['due'],
        });
      } else if (moment(options.due, 'MM-DD-YYYY').isValid()) {
        const due = moment(options.due, 'MM-DD-YYYY').set({
          h: 0,
          m: 0,
          s: 0,
        });

        conditions = update(conditions, {
          due: {
            $set: {
              $gte: due.toDate(),
              $lte: due.add(1, 'd').toDate(),
            },
          },
        });
      } else {
        throw createError(400, {
          message: 'Invalid due option!',
        });
      }

      const [todos, total] = await Promise.all([
        Todo.find(conditions),
        Todo.countDocuments(conditions),
      ]);

      return res.status(200).json({
        total,
        todos,
      });
    } catch (err) {
      return next(err);
    }
  }

  public static async AddTodo(req: Request, res: Response, next: NextFunction) {
    try {
      const { _id: userId } = (<ICustomRequest>req).user;

      const formData: IAddTodoFormData = {
        userId: userId.toHexString(),
        listId: req.body.listId || null,
        name: req.body.name,
        notes: req.body.notes || null,
        url: req.body.url || null,
        due: req.body.due,
        priority: req.body.priority || TodoPriority.NONE,
      };

      const validations: IAddTodoFormValidations = {
        userId: TodoValidator.UserId(formData.userId),
        listId: TodoValidator.ListId(formData.listId),
        name: TodoValidator.Name(formData.name),
        notes: TodoValidator.Notes(formData.notes),
        url: TodoValidator.URL(formData.url),
        due: TodoValidator.Due(formData.due),
        priority: TodoValidator.Priority(formData.priority),
      };

      if (!Object.values(validations).every((v) => v.error === false)) {
        throw createError(400, {
          validations,
        });
      }

      const createdTodo: ITodoDocument = await Todo.create({
        userId: new Types.ObjectId(formData.userId),
        listId: formData.listId,
        name: formData.name,
        notes: formData.notes,
        url: formData.url,
        due: moment(formData.due).toDate(),
        priority: formData.priority,
      });

      return res
        .status(201)
        .json({ message: `Added "${createdTodo.name}"`, todo: createdTodo });
    } catch (err) {
      return next(err);
    }
  }

  public static async UpdateTodo(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { _id: userId } = (<ICustomRequest>req).user;

      const formData: IUpdateTodoFormData = {
        _id: req.params.todoId || req.query.todoId || req.body._id,
        userId: userId.toHexString(),
        listId: req.body.listId,
        name: req.body.name,
        notes: req.body.notes || null,
        url: req.body.url || null,
        due: req.body.due,
        priority: req.body.priority || TodoPriority.NONE,
      };

      const validations: IUpdateTodoFormValidations = {
        _id: TodoValidator.Id(formData._id),
        userId: TodoValidator.UserId(formData.userId),
        listId: TodoValidator.ListId(formData.listId),
        name: TodoValidator.Name(formData.name),
        notes: TodoValidator.Notes(formData.notes),
        url: TodoValidator.URL(formData.url),
        due: TodoValidator.Due(formData.due),
        priority: TodoValidator.Priority(formData.priority),
      };

      if (!Object.values(validations).every((v) => v.error === false)) {
        throw createError(400, {
          validations,
        });
      }

      const updatedTodo: ITodoDocument | null = await Todo.findOneAndUpdate(
        {
          _id: new Types.ObjectId(formData._id),
        },
        {
          listId: formData.listId,
          userId: new Types.ObjectId(formData.userId),
          name: formData.name,
          notes: formData.notes,
          url: formData.url,
          due: moment(formData.due).toDate(),
          priority: formData.priority as TodoPriority,
        },
        { new: true },
      );

      if (!updatedTodo) {
        throw createError(404, {
          message: `Todo with ID ${formData._id} is not found!`,
        });
      }

      return res
        .status(200)
        .json({ message: `Updated "${updatedTodo.name}"`, todo: updatedTodo });
    } catch (err) {
      return next(err);
    }
  }

  public static async CompleteTodo(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const _id: string | any =
        req.params.todoId || req.query.todoId || req.body._id;
      const validation = TodoValidator.Id(_id);

      if (validation.error) {
        throw createError(400, {
          message: validation.text,
        });
      }

      const completedTodo: ITodoDocument | null = await Todo.findOneAndUpdate(
        {
          _id: new Types.ObjectId(_id),
        },
        {
          completed: true,
        },
        {
          new: true,
        },
      );

      if (!completedTodo) {
        throw createError(404, `Todo with ID ${_id} is not found!`);
      }

      return res.status(200).json({
        message: `Completed "${completedTodo.name}"`,
        todo: completedTodo,
      });
    } catch (err) {
      return next(err);
    }
  }

  public static async UncompleteTodo(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const _id: string | any =
        req.params.todoId || req.query.todoId || req.body._id;
      const validation = TodoValidator.Id(_id);

      if (validation.error) {
        throw createError(400, {
          message: validation.text,
        });
      }

      const uncompletedTodo: ITodoDocument | null = await Todo.findOneAndUpdate(
        {
          _id: new Types.ObjectId(_id),
        },
        { completed: false },
        { new: true },
      );

      if (!uncompletedTodo) {
        throw createError(404, `Todo with ID ${_id} is not found!`);
      }

      return res.status(200).json({
        message: `Uncompleted "${uncompletedTodo.name}"`,
        todo: uncompletedTodo,
      });
    } catch (err) {
      return next(err);
    }
  }

  public static async UpdateTodoPriority(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const _id: string | any =
        req.params.todoId || req.query.todoId || req.body._id;
      const validation = TodoValidator.Id(_id);

      if (validation.error) {
        throw createError(400, {
          message: validation.text,
        });
      }

      const { priority }: Partial<ITodo> = req.body;

      if (!priority) {
        throw createError(400, {
          message: 'Priority cannot be empty!',
        });
      }

      if (!Object.values(TodoPriority).includes(priority)) {
        throw createError(400, {
          message: 'Invalid priority option!',
        });
      }

      const foundTodo: ITodoDocument | null = await Todo.findOneAndUpdate(
        {
          _id: new Types.ObjectId(_id),
        },
        {
          priority,
        },
        { new: true },
      );

      if (!foundTodo) {
        throw createError(404, `Todo with ID ${_id} is not found!`);
      }

      return res.status(200).json({
        message: `Updated "${foundTodo.name}" priority!`,
        todo: foundTodo,
      });
    } catch (err) {
      return next(err);
    }
  }

  public static async UpdateTodoList(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const _id: string | any =
        req.params.todoId || req.query.todoId || req.body._id;
      const validation = TodoValidator.Id(_id);

      if (validation.error) {
        throw createError(400, {
          message: validation.text,
        });
      }

      const { listId }: IUpdateTodoFormData = req.body;

      const listIdValidation = TodoValidator.ListId(listId);

      if (listIdValidation.error) {
        throw createError(400, {
          message: listIdValidation.text,
        });
      }

      const foundTodo: ITodoDocument | null = await Todo.findOneAndUpdate(
        {
          _id: new Types.ObjectId(_id),
        },
        {
          listId: listId !== null ? new Types.ObjectId(listId) : null,
        },
        { new: true },
      );

      if (!foundTodo) {
        throw createError(404, `Todo with ID ${_id} is not found!`);
      }

      return res.status(200).json({
        message: `Updated "${foundTodo.name}" list!`,
        todo: foundTodo,
      });
    } catch (err) {
      return next(err);
    }
  }

  public static async DeleteTodo(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const _id: string | any = req.params.todoId || req.query.todoId;
      const validation = TodoValidator.Id(_id);

      if (validation.error) {
        throw createError(400, {
          message: validation.text,
        });
      }

      const deletedTodo: ITodoDocument | null = await Todo.findOneAndDelete({
        _id: new Types.ObjectId(_id),
      });

      if (!deletedTodo) {
        throw createError(404, `Todo with ID ${_id} is not found!`);
      }

      return res
        .status(200)
        .json({ message: `Deleted "${deletedTodo.name}"`, todo: deletedTodo });
    } catch (err) {
      return next(err);
    }
  }
}
