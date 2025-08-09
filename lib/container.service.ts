import 'reflect-metadata';
import { Container } from 'inversify';
import { DataContainerModule } from "@/lib/data/data.container-module";

export interface ContainerModule {
  bind: (container: Container) => Promise<void> | void;
}

export class ContainerService {

  private static instance: Container | null = null;

  private static readonly modules: ContainerModule[] = [
    new DataContainerModule()
  ]

  private constructor() {
    // Private constructor to prevent instantiation
  }

  public static getInstance(): Container {
    if (ContainerService.instance === null) {
      ContainerService.instance = new Container();
      ContainerService.initModules();
    }

    return ContainerService.instance;
  }

  private static initModules(): void {
    if (ContainerService.instance === null) {
      throw new Error("Container is not initialized");
    }

    for (const containerModule of ContainerService.modules) {
      containerModule.bind(ContainerService.instance);
    }
  }
}