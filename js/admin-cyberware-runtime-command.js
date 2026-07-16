window.WS_APP = window.WS_APP || {};

(function initAdminCyberwareRuntimeCommand(app) {
  "use strict";
  if (app.AdminCyberwareRuntimeCommand) return;

  const OPERATIONS = new Set(["INSTALL", "DEINSTALL", "REPLACE", "MAINTENANCE", "DIAGNOSTIC", "REPAIR", "CALIBRATION", "FIRMWARE_UPDATE"]);
  const MODES = new Set(["PLAYER_WORLD_OPERATION", "ADMIN_DIRECT_OPERATION"]);
  const PLANNER_OPERATIONS = new Set(["INSTALL", "DEINSTALL", "REPLACE"]);
  const MAINTENANCE_OPERATION = Object.freeze({ MAINTENANCE: "DIAGNOSTIC", DIAGNOSTIC: "DIAGNOSTIC", REPAIR: "REPAIR", CALIBRATION: "CALIBRATE", FIRMWARE_UPDATE: "FIRMWARE" });

  const clone = (value) => value == null ? value : (typeof structuredClone === "function" ? structuredClone(value) : JSON.parse(JSON.stringify(value)));
  const text = (value="") => String(value ?? "").trim();
  const token = (value="") => text(value).toUpperCase().replace(/[\s-]+/g,"_");
  const itemId = (item={}) => text(item.instanceId || item.id || item.itemId);
  const normalizeActor = (actor={}) => {
    const current=app.currentUser||{};
    return { actorId:text(actor.actorId||actor.id||actor.login||current.id||current.login), actorRole:token(actor.actorRole||actor.role||current.role), displayName:text(actor.displayName||actor.name||actor.login||current.displayName||current.login||"ADMIN") };
  };
  const normalizeMode = (value="") => MODES.has(token(value)) ? token(value) : "PLAYER_WORLD_OPERATION";
  const normalizeOperation = (value="") => {
    const op=token(value||"INSTALL");
    if (op==="CALIBRATE") return "CALIBRATION";
    if (op==="FIRMWARE") return "FIRMWARE_UPDATE";
    return op;
  };

  function getCitizen(citizenId="") { return app.getCitizenById?.(text(citizenId)) || null; }
  function getInstalled(citizenId="") { return app.getInstalledCyberwareInstanceViews?.(text(citizenId)) || []; }
  function getAdminCyberwareRuntimeSnapshot(citizenId="") {
    const citizen=getCitizen(citizenId);
    if (!citizen) return { ok:false, resultCode:"CITIZEN_NOT_FOUND", citizen:null, installed:[], runtime:null, planner:null, worldOperations:[] };
    const installed=getInstalled(citizen.id);
    const runtime=app.getCyberwareRuntimeState?.(citizen) || { installed, operational:{}, counts:{}, neuralCore:{} };
    const planner=app.getCyberwarePlannerProjection?.(citizen.id) || null;
    const worldOperations=(app.getWorldBridgeOperations?.()||[]).filter((operation)=>text(operation.citizenId)===text(citizen.id) && (token(operation.operationType).includes("CYBERWARE") || token(operation.metadata?.cyberwareOperationType)));
    return { ok:true, resultCode:"ADMIN_CYBERWARE_RUNTIME_SNAPSHOT_READY", citizen:clone(citizen), installed:clone(installed), runtime:clone(runtime), planner:clone(planner), worldOperations:clone(worldOperations) };
  }

  function getAuditReplay(input={}) {
    const key=text(input.idempotencyKey); if (!key || typeof app.getAdminAuditEvents!=="function") return { replay:null, conflict:null };
    const match=(app.getAdminAuditEvents()||[]).find((event)=>text(event.request?.idempotencyKey)===key);
    if (!match) return { replay:null, conflict:null };
    const expected=`ADMIN_CYBERWARE_${normalizeOperation(input.operationType||input.operation)}_${normalizeMode(input.executionMode)}`;
    const citizenMatch=(match.targetRefs||[]).some((ref)=>token(ref.type)==="CITIZEN" && text(ref.id)===text(input.citizenId));
    return match.sourceCommand===expected && citizenMatch ? { replay:match, conflict:null } : { replay:null, conflict:match };
  }

  function previewAdminCyberwareOperation(input={}) {
    const actor=normalizeActor(input.actor||{}), operation=normalizeOperation(input.operationType||input.operation), executionMode=normalizeMode(input.executionMode);
    const blockers=[], warnings=[];
    if (!actor.actorId) blockers.push("ACTOR_REQUIRED");
    if (actor.actorRole!=="ADMIN") blockers.push("ADMIN_ROLE_REQUIRED");
    if (!OPERATIONS.has(operation)) blockers.push("ADMIN_CYBERWARE_OPERATION_INVALID");
    const citizen=getCitizen(input.citizenId);
    if (!citizen) blockers.push("CITIZEN_NOT_FOUND");
    if (typeof app.appendAdminAuditResult!=="function") blockers.push("ADMIN_AUDIT_STORE_UNAVAILABLE");
    if (executionMode==="ADMIN_DIRECT_OPERATION") warnings.push("ADMIN_DIRECT_BYPASSES_WORLD_BILLING_SERVICE_AND_SCHEDULE");

    let plan=null, quote=null, targetItem=null, sourceItem=null;
    if (citizen && PLANNER_OPERATIONS.has(operation)) {
      if (typeof app.buildCyberwareOperationPlan!=="function") blockers.push("CYBERWARE_PLANNER_UNAVAILABLE");
      else {
        plan=app.buildCyberwareOperationPlan(citizen.id, { operation, sourceItemId:text(input.sourceItemId), targetItemId:text(input.targetItemId), returnDestinationId:text(input.returnDestinationId), primarySlot:text(input.primarySlot), surgeryPreset:text(input.surgeryPreset||"LOCAL_CLINIC") });
        if (!plan?.valid) blockers.push(...(plan?.blockers?.length ? plan.blockers : [plan?.reason||"CYBERWARE_PLAN_BLOCKED"]));
        warnings.push(...(plan?.warnings||[]));
        sourceItem=text(plan?.sourceItemId) ? app.getItemInstanceView?.(plan.sourceItemId) : null;
        targetItem=text(plan?.targetItemId) ? app.getItemInstanceView?.(plan.targetItemId) : null;
      }
      if (executionMode==="PLAYER_WORLD_OPERATION" && typeof app.startCyberwareService!=="function") blockers.push("CYBERWARE_WORLD_BRIDGE_UNAVAILABLE");
      if (executionMode==="ADMIN_DIRECT_OPERATION" && typeof app.commitCyberwareOperationPlan!=="function") blockers.push("CYBERWARE_DIRECT_COMMIT_UNAVAILABLE");
    } else if (citizen && OPERATIONS.has(operation)) {
      const instanceId=text(input.instanceId||input.targetItemId);
      targetItem=instanceId ? app.getItemInstanceView?.(instanceId) : null;
      if (!targetItem) blockers.push("ITEM_INSTANCE_NOT_FOUND");
      const maintenanceOperation=MAINTENANCE_OPERATION[operation]||"DIAGNOSTIC";
      if (targetItem && typeof app.buildCyberwareMaintenanceQuote==="function") {
        quote=app.buildCyberwareMaintenanceQuote(citizen, targetItem, maintenanceOperation);
        if (quote?.valid===false) blockers.push(...(quote.blockers?.length ? quote.blockers : [quote.reason||"MAINTENANCE_BLOCKED"]));
        warnings.push(...(quote?.warnings||[]));
      } else if (targetItem) blockers.push("CYBERWARE_MAINTENANCE_QUOTE_UNAVAILABLE");
      if (typeof app.runCyberwareMaintenance!=="function") blockers.push("CYBERWARE_MAINTENANCE_API_UNAVAILABLE");
    }
    return { ok:blockers.length===0, resultCode:blockers[0]||"ADMIN_CYBERWARE_OPERATION_PREVIEW_READY", actor, operationType:operation, executionMode, citizen:citizen?clone(citizen):null, plan:clone(plan), quote:clone(quote), sourceItem:clone(sourceItem), targetItem:clone(targetItem), expectedPlanId:text(plan?.planId), expectedInstanceRevision:Number(targetItem?.revision||targetItem?.recordRevision||0), blockers:[...new Set(blockers)], warnings:[...new Set(warnings)] };
  }

  function audit(actor,input,preview,domainResult,status,resultCode,message) {
    const operation=preview.operationType, worldOperation=domainResult?.worldOperation||domainResult?.operation||null;
    const instanceIds=[text(preview.sourceItem&&itemId(preview.sourceItem)),text(preview.targetItem&&itemId(preview.targetItem)),...(Array.isArray(worldOperation?.refs?.instanceIds)?worldOperation.refs.instanceIds:[])].filter(Boolean);
    return app.appendAdminAuditResult?.({ actor, workspace:"CYBERWARE_RUNTIME", category:"CYBERWARE", sourceCommand:`ADMIN_CYBERWARE_${operation}_${preview.executionMode}`, citizenId:text(input.citizenId), targetRefs:[{type:"CITIZEN",id:text(input.citizenId)},...instanceIds.map((id)=>({type:"ITEM_INSTANCE",id})),...(worldOperation?.operationId?[{type:"WORLD_BRIDGE",id:worldOperation.operationId}]:[])], request:{idempotencyKey:text(input.idempotencyKey),correlationId:text(input.correlationId||`admin-cyberware:${input.citizenId}:${operation}:${input.idempotencyKey}`)}, result:{status,resultCode,message}, domainRefs:{operationId:text(worldOperation?.operationId),serviceOrderId:text(worldOperation?.refs?.serviceOrderId),billingIntentId:text(worldOperation?.refs?.billingIntentId),billingTransactionId:text(worldOperation?.refs?.billingTransactionId),itemTransactionId:text(worldOperation?.refs?.itemTransactionId),instanceIds:[...new Set(instanceIds)]}, previousRevision:Number(input.expectedInstanceRevision||0)||null, nextRevision:Number(domainResult?.item?.revision||domainResult?.targetItem?.revision||0)||null, summary:message, metadata:{operationType:operation,executionMode:preview.executionMode,operatorNote:text(input.operatorNote),providerId:text(input.providerId),returnDestinationId:text(input.returnDestinationId),primarySlot:text(input.primarySlot),domainReason:text(domainResult?.reason),bypassWorldOrchestration:preview.executionMode==="ADMIN_DIRECT_OPERATION"} }, {actor});
  }

  async function executeAdminCyberwareOperation(input={}) {
    const replay=getAuditReplay(input);
    if (replay.conflict) return {ok:false,status:"FAILED",resultCode:"ADMIN_CYBERWARE_IDEMPOTENCY_CONFLICT",auditEvent:replay.conflict};
    if (replay.replay) return {ok:replay.replay.result?.status==="SUCCEEDED",replay:true,status:replay.replay.result?.status,resultCode:replay.replay.result?.resultCode,auditEvent:replay.replay};
    const preview=previewAdminCyberwareOperation(input), actor=preview.actor||normalizeActor(input.actor||{});
    if (!text(input.idempotencyKey)) return {ok:false,status:"FAILED",resultCode:"IDEMPOTENCY_KEY_REQUIRED",preview};
    if (!text(input.operatorNote)) return {ok:false,status:"FAILED",resultCode:"OPERATOR_NOTE_REQUIRED",preview};
    if (!preview.ok) {
      const code=preview.resultCode||"ADMIN_CYBERWARE_OPERATION_BLOCKED";
      const logged=audit(actor,input,preview,{reason:code},"FAILED",code,`Admin Cyberware ${preview.operationType} blocked: ${code}.`);
      return {ok:false,status:"FAILED",resultCode:code,preview,blockers:preview.blockers,auditEvent:logged?.event||null};
    }
    if (PLANNER_OPERATIONS.has(preview.operationType) && text(input.expectedPlanId)!==preview.expectedPlanId) {
      const code="CYBERWARE_PLAN_STALE", logged=audit(actor,input,preview,{reason:code},"FAILED",code,"Admin Cyberware operation rejected because the plan changed.");
      return {ok:false,status:"FAILED",resultCode:code,preview,auditEvent:logged?.event||null};
    }
    if (!PLANNER_OPERATIONS.has(preview.operationType) && Number(input.expectedInstanceRevision||0)!==Number(preview.expectedInstanceRevision||0)) {
      const code="ITEM_INSTANCE_STALE_REVISION", logged=audit(actor,input,preview,{reason:code},"FAILED",code,"Admin Cyberware maintenance rejected because the ItemInstance revision changed.");
      return {ok:false,status:"FAILED",resultCode:code,preview,auditEvent:logged?.event||null};
    }
    let result;
    if (PLANNER_OPERATIONS.has(preview.operationType)) {
      result=app.commitCyberwareOperationPlan(preview.citizen.id,preview.expectedPlanId,{ executionMode:preview.executionMode, providerId:text(input.providerId), scheduledStartAt:text(input.scheduledStartAt), paymentSource:text(input.paymentSource||"CREDITS"), coverageAuthorizations:Array.isArray(input.coverageAuthorizations)?input.coverageAuthorizations:[], idempotencyKey:text(input.idempotencyKey), source:"ADMIN_CYBERWARE_RUNTIME", deferPersistence:false });
    } else {
      result=app.runCyberwareMaintenance(preview.citizen.id,{ instanceId:itemId(preview.targetItem), operation:MAINTENANCE_OPERATION[preview.operationType], executionMode:preview.executionMode, providerId:text(input.providerId), scheduledStartAt:text(input.scheduledStartAt), paymentSource:text(input.paymentSource||"CREDITS"), firmwareReleaseId:text(input.firmwareReleaseId), idempotencyKey:text(input.idempotencyKey), source:"ADMIN_CYBERWARE_RUNTIME", deferPersistence:false });
    }
    if (result && typeof result.then==="function") result=await result;
    const ok=result?.ok===true, worldStatus=token(result?.worldOperation?.status||result?.operation?.status||result?.status);
    const recovery=["RECOVERY_REQUIRED","PAYMENT_RECOVERY_REQUIRED","COMPENSATION_REQUIRED"].includes(worldStatus);
    const status=ok?"SUCCEEDED":recovery?"RECOVERY_REQUIRED":"FAILED";
    const code=ok?`ADMIN_CYBERWARE_${preview.operationType}_${preview.executionMode}_SUCCEEDED`:text(result?.reason||`ADMIN_CYBERWARE_${preview.operationType}_FAILED`);
    const logged=audit(actor,input,preview,result,status,code,ok?`Admin Cyberware ${preview.operationType} completed through ${preview.executionMode}.`:`Admin Cyberware ${preview.operationType} failed: ${code}.`);
    return {ok,status,resultCode:code,operationType:preview.operationType,executionMode:preview.executionMode,preview,domainResult:clone(result),worldOperation:clone(result?.worldOperation||result?.operation||null),auditEvent:logged?.event||null};
  }

  const api=Object.freeze({ getSnapshot:getAdminCyberwareRuntimeSnapshot, preview:previewAdminCyberwareOperation, execute:executeAdminCyberwareOperation });
  app.AdminCyberwareRuntimeCommand=api;
  app.getAdminCyberwareRuntimeSnapshot=getAdminCyberwareRuntimeSnapshot;
  app.previewAdminCyberwareOperation=previewAdminCyberwareOperation;
  app.executeAdminCyberwareOperation=executeAdminCyberwareOperation;
})(window.WS_APP);