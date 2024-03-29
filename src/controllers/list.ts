import { Request, Response, NextFunction } from 'express';
import { Types, QueryOptions, FilterQuery } from 'mongoose';
import createError from 'http-errors';

// Types
import { ICustomRequest } from '@/types';
import {
  IListDocument,
  IAddListFormValidations,
  IAddListFormData,
  IUpdateListFormValidations,
  IUpdateListFormData,
} from '@/types/list';

// Models
import { List } from '@/models';

// Utils
import { ListValidator } from '@/utils/validator';

export default class ListController {
  public static async GetAllLists(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { _id: userId } = (<ICustomRequest>req).user;

      const options: QueryOptions = {
        limit: 100,
        skip: 0,
        sort: {
          due: -1,
        },
      };

      const conditions: FilterQuery<Pick<IListDocument, keyof IListDocument>> =
        {
          userId,
        };

      const [total, lists] = await Promise.all([
        List.countDocuments(conditions),
        List.find(conditions, null, options),
      ]);

      return res.status(200).json({
        total,
        lists,
      });
    } catch (err) {
      return next(err);
    }
  }

  public static async AddList(req: Request, res: Response, next: NextFunction) {
    try {
      const { _id: userId } = (<ICustomRequest>req).user;
      const formData: IAddListFormData = {
        userId: userId!.toHexString(),
        name: req.body.name,
        color: req.body.color,
      };

      const validations: IAddListFormValidations = {
        userId: ListValidator.UserId(formData.userId),
        name: ListValidator.Name(formData.name),
        color: ListValidator.Color(formData.color),
      };

      if (!Object.values(validations).every((v) => v.error === false)) {
        throw createError(400, {
          message: 'Plese correct list validations!',
          validations,
        });
      }

      const createdList: IListDocument = await List.create({
        userId: new Types.ObjectId(formData.userId),
        name: formData.name,
        color: formData.color,
      });

      return res.status(201).json({ list: createdList });
    } catch (err) {
      return next(err);
    }
  }

  public static async UpdateList(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { _id: userId } = (<ICustomRequest>req).user;
      const formData: IUpdateListFormData = {
        _id: req.params.listId || req.query.listId || req.body._id,
        userId: userId.toHexString(),
        name: req.body.name,
        color: req.body.color,
      };

      const validations: IUpdateListFormValidations = {
        _id: ListValidator.Id(formData._id),
        userId: ListValidator.UserId(formData.userId),
        name: ListValidator.Name(formData.name),
        color: ListValidator.Color(formData.color),
      };

      if (!Object.values(validations).every((v) => v.error === false)) {
        throw createError(400, {
          message: 'Please correct list validations!',
          validations,
        });
      }

      const updatedList: IListDocument | null = await List.findOneAndUpdate(
        {
          $and: [
            {
              _id: new Types.ObjectId(formData._id),
            },
            {
              userId: new Types.ObjectId(formData.userId),
            },
          ],
        },
        {
          name: formData.name,
          color: formData.color,
        },
        { new: true },
      );

      if (!updatedList) {
        throw createError(404, `List with ID ${formData._id} is not found!`);
      }

      return res.status(200).json({ list: updatedList });
    } catch (err) {
      return next(err);
    }
  }

  public static async DeleteList(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { _id: userId } = (<ICustomRequest>req).user;
      const _id: string | any = req.params.listId || req.query.listId;
      const validation = ListValidator.Id(_id);

      if (validation.error) {
        throw createError(400, {
          message: validation.text,
        });
      }

      const deletedList: IListDocument | null = await List.findOneAndDelete({
        $and: [
          {
            _id: new Types.ObjectId(_id),
          },
          {
            userId,
          },
        ],
      });

      if (!deletedList) {
        throw createError(404, `List with ID ${_id} is not found!`);
      }

      return res.status(200).json({ list: deletedList });
    } catch (err) {
      return next(err);
    }
  }
}
