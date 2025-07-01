import { User } from "@/lib/domain/models/user.model";

export abstract class UserRepository {
  abstract getLoggedInUser(): Promise<User | null>;
}