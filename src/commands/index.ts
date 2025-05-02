#!/usr/bin/env ts-node

import { dirname, join } from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';

import { program } from 'commander';

// Base directories (adjust as needed)
const CONTROLLERS_DIR = join(__dirname, '../controllers');
const RESOURCES_DIR = join(__dirname, '../resources');
const STUBS_DIR = join(__dirname, 'stubs');

// Utility to ensure directory exists
function ensureDirectory (filePath: string) {
    const dir = dirname(filePath);
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
    }
}

// Utility to generate file from stub
function generateFile (stubPath: string, outputPath: string, replacements: Record<string, string>) {
    if (existsSync(outputPath)) {
        console.error(`Error: ${outputPath} already exists.`);
        process.exit(1);
    }

    let content = readFileSync(stubPath, 'utf-8');
    for (const [key, value] of Object.entries(replacements)) {
        content = content.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }

    ensureDirectory(outputPath);
    writeFileSync(outputPath, content);
    console.log(`Created: ${outputPath}`);
}

const makeController = (name: string, options: any) => {
    name = name.endsWith('Controller') ? name.replace(/controller/i, '') : name

    const controllerName = name.endsWith('Controller') ? name : `${name}Controller`;
    const fileName = `${controllerName}.ts`;
    const outputPath = join(CONTROLLERS_DIR, fileName);
    const stubPath = join(STUBS_DIR, options.model
        ? 'controller.model.stub'
        : options.api ? 'controller.api.stub' : 'controller.stub'
    );

    if (!existsSync(stubPath)) {
        console.error(`Error: Stub file ${stubPath} not found.`);
        process.exit(1);
    }

    generateFile(stubPath, outputPath, {
        ControllerName: controllerName,
        ModelName: options.model?.toLowerCase(),
        Name: controllerName.replace(/controller/i, ''),
    });
}

const makeResource = (name: string, options: any) => {
    const resourceName = name.endsWith('Resource') || name.endsWith('Collection') ? name : `${name}Resource`;
    const fileName = `${resourceName}.ts`;
    const outputPath = join(RESOURCES_DIR, fileName);
    const stubPath = join(STUBS_DIR, options.collection || name.endsWith('Collection') ? 'resource.collection.stub' : 'resource.stub');

    if (!existsSync(stubPath)) {
        console.error(`Error: Stub file ${stubPath} not found.`);
        process.exit(1);
    }

    generateFile(stubPath, outputPath, {
        ResourceName: resourceName,
        CollectionResourceName: resourceName.replace(/(Resource|Collection)$/, '') + 'Resource'
    });
}

// CLI Commands
program
    .name('command')
    .description('Command to help with repeating task.')
    .version('0.0.1');

program
    .command('make:controller')
    .argument('<name>', 'name of the controller to create')
    .option('--api', 'make an API controller')
    .option('-m, --model <name>', 'name of model to attach to controller')
    .description('Create a new controller file')
    .action((name: string, options) => {
        makeController(name, options)
    });

program
    .command('make:resource')
    .argument('<name>', 'name of the resource to create')
    .description('Create a new resource or resource collection file')
    .option('--collection', 'Create a resource collection')
    .action((name: string, options: { collection?: boolean }) => {
        makeResource(name, options)
    });

program
    .command('make:full-resource')
    .argument('<prefix>', 'prefix of the resources to create, "Admin" will create AdminResource, AdminCollection and AdminController')
    .description('Create a full new set of API resources (Controller, Resource, Collection)')
    .option('-m, --model <name>', 'name of model to attach to the generated controller')
    .action((prefix: string, options: { collection?: boolean }) => {
        makeResource(prefix, {})
        makeResource(prefix + 'Collection', { collection: true })
        makeController(prefix, Object.assign({}, options, { api: true }))
    });

// Parse CLI arguments
program.parse(process.argv);
