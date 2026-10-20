#!/usr/bin/env node
import assert from 'node:assert/strict';
import { getRouteAlias, ROUTE_ALIASES } from '../src/lib/route-aliases.mjs';

const canonical = '/editorial-independence-and-sustainability/';
assert.equal(getRouteAlias('why-editorial-independence-and-financial-sustainability-both-matter'), canonical);
assert.equal(getRouteAlias('/WHY-EDITORIAL-INDEPENDENCE-AND-FINANCIAL-SUSTAINABILITY-BOTH-MATTER/'), canonical);
assert.equal(getRouteAlias('editorial-independence-and-sustainability'), null);
assert.equal(getRouteAlias(''), null);
assert.equal(Object.keys(ROUTE_ALIASES).length, 1);
console.log('ROUTE_ALIAS_TESTS_OK true');
