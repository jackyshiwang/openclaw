import { DataTypes, Model } from "sequelize";
import sequelize from "./index.js";

export class User extends Model {
  declare id: number;
  declare openid: string;
  declare cloud_sync_time: Date;
}

User.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    openid: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    cloud_sync_time: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "User",
    tableName: "users",
    timestamps: true,
  },
);
