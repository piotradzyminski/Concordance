"use strict";
const test=require("node:test");const assert=require("node:assert/strict");const {createBrowserRuntime}=require("../helpers/browser-runtime.cjs");
function runtime(){let audits=[];let direct=0;const citizen={id:"citizen-a",role:"citizen"};const item={instanceId:"cw-1",id:"cw-1",ownerId:"citizen-a",revision:4,location:{type:"BODY"}};const rt=createBrowserRuntime({wsApp:{currentUser:{id:"admin-1",role:"admin"},getCitizenById:(id)=>id==="citizen-a"?citizen:null,getInstalledCyberwareInstanceViews:()=>[item],getCyberwareRuntimeState:()=>({installed:[item],counts:{enabled:1},neuralCore:{security:70,stability:80}}),getCyberwarePlannerProjection:()=>({sources:[{instanceId:"cw-source"}]}),getWorldBridgeOperations:()=>[],getItemInstanceView:(id)=>id==="cw-1"?item:{instanceId:id,ownerId:"citizen-a"},buildCyberwareMaintenanceQuote:()=>({valid:true,cost:10,durationMinutes:5,blockers:[],warnings:[]}),runCyberwareMaintenance:()=>{direct++;return {ok:true,reason:"MAINTENANCE_COMPLETED",item:{...item,revision:5}}},getAdminAuditEvents:()=>audits,appendAdminAuditResult:(input)=>{const event={auditEventId:`a-${audits.length+1}`,sourceCommand:input.sourceCommand,targetRefs:input.targetRefs,request:input.request,result:input.result};audits.push(event);return {ok:true,event};}}});rt.load("js/admin-cyberware-runtime-command.js");return {rt,audits,getDirect:()=>direct};}
test("direct maintenance is revisioned, audited and idempotent",async()=>{const {rt,audits,getDirect}=runtime();const input={actor:{actorId:"admin-1",actorRole:"ADMIN"},citizenId:"citizen-a",operationType:"REPAIR",executionMode:"ADMIN_DIRECT_OPERATION",instanceId:"cw-1",targetItemId:"cw-1",operatorNote:"Repair fixture",idempotencyKey:"cw-admin-1",expectedInstanceRevision:4};const result=await rt.window.WS_APP.executeAdminCyberwareOperation(input);assert.equal(result.ok,true);assert.equal(getDirect(),1);assert.equal(audits.length,1);const replay=await rt.window.WS_APP.executeAdminCyberwareOperation(input);assert.equal(replay.replay,true);assert.equal(getDirect(),1);assert.equal(audits.length,1);});
test("stale item revision blocks direct maintenance",async()=>{const {rt,getDirect}=runtime();const result=await rt.window.WS_APP.executeAdminCyberwareOperation({actor:{actorId:"admin-1",actorRole:"ADMIN"},citizenId:"citizen-a",operationType:"REPAIR",executionMode:"ADMIN_DIRECT_OPERATION",instanceId:"cw-1",targetItemId:"cw-1",operatorNote:"Repair fixture",idempotencyKey:"cw-admin-stale",expectedInstanceRevision:3});assert.equal(result.ok,false);assert.equal(result.resultCode,"ITEM_INSTANCE_STALE_REVISION");assert.equal(getDirect(),0);});
test("world install delegates to Planner and Cyberware World Bridge", async () => {
  let audits = [];
  let commits = 0;
  const plan = { valid: true, planId: "plan-install-1", operation: "INSTALL", sourceItemId: "cw-source", targetItemId: "", occupiedSlots: ["leftHandCore"], warnings: [], blockers: [] };
  const rt = createBrowserRuntime({ wsApp: {
    currentUser: { id: "admin-1", role: "admin" },
    getCitizenById: (id) => id === "citizen-a" ? { id: "citizen-a" } : null,
    getItemInstanceView: (id) => ({ instanceId: id, ownerId: "citizen-a" }),
    buildCyberwareOperationPlan: () => structuredClone(plan),
    startCyberwareService: () => ({ ok: true }),
    commitCyberwareOperationPlan: (_citizenId, expectedPlanId, options) => {
      commits += 1;
      assert.equal(expectedPlanId, plan.planId);
      assert.equal(options.executionMode, "PLAYER_WORLD_OPERATION");
      return { ok: true, status: "SCHEDULED", worldOperation: { operationId: "world-cw-1", status: "SCHEDULED", refs: { serviceOrderId: "svc-1", instanceIds: ["cw-source"] } } };
    },
    getAdminAuditEvents: () => audits,
    appendAdminAuditResult: (input) => { const event = { auditEventId: `a-${audits.length + 1}`, sourceCommand: input.sourceCommand, targetRefs: input.targetRefs, request: input.request, result: input.result }; audits.push(event); return { ok: true, event }; }
  }});
  rt.load("js/admin-cyberware-runtime-command.js");
  const input = { actor: { actorId: "admin-1", actorRole: "ADMIN" }, citizenId: "citizen-a", operationType: "INSTALL", executionMode: "PLAYER_WORLD_OPERATION", sourceItemId: "cw-source", operatorNote: "Schedule canonical install.", idempotencyKey: "cw-world-install", expectedPlanId: plan.planId };
  const result = await rt.window.WS_APP.executeAdminCyberwareOperation(input);
  assert.equal(result.ok, true);
  assert.equal(result.worldOperation.operationId, "world-cw-1");
  assert.equal(commits, 1);
  assert.equal(audits.length, 1);
});
