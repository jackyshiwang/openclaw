import { DataTypes, Model } from "sequelize";
import sequelize from "./index.js";

export class ReflectionBackup extends Model {
  declare id: number;
  declare user_id: number;
  declare local_id: string;
  declare content_json: string;
  declare sync_time: Date;
}

ReflectionBackup.init(
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
    local_id: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "ID from the local phone storage",
    },
    content_json: {
      type: DataTypes.TEXT("long"), // Huge text field
      allowNull: false,
    },
    sync_time: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: "ReflectionBackup",
    tableName: "reflection_backups",
    timestamps: true,
  },
);
