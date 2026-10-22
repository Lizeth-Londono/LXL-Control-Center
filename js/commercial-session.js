/* Ephemeral repository boundary. No network or browser persistence. A future authenticated
 * adapter must enforce ownership and private storage server-side; it cannot trust this DEMO. */
(function(root){'use strict';let value=null;root.LXLCommercialSession={get:()=>value,set:next=>{value=next;},clear:()=>{value=null;},capabilities:Object.freeze({persistent:false,authenticated:false,remote:false})};})(globalThis);
