import { DataTypes, Model } from "sequelize";
import sequelize from "../models/index.js";

export class Goal extends Model {
  declare id: number;
  declare user_id: number;
  declare content: string;
  declare category: string; // 'work' | 'life'
  declare status: string; // 'active' | 'completed'
}

Goal.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    content: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    category: {
      type: DataTypes.STRING,
      defaultValue: "life",
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: "active",
    },
  },
  {
    sequelize,
    modelName: "Goal",
    tableName: "goals",
    timestamps: true,
  },
);
