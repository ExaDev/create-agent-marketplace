#!/usr/bin/env node
import { runCli } from 'create-agent-marketplace';

await runCli(process.argv.slice(2));
