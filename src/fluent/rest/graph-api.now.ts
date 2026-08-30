import "@servicenow/sdk/global";
import { RestApi } from "@servicenow/sdk/core";
import { process as processGraph } from "../../server/graph/graph-handler";
import { process as processCi } from "../../server/graph/ci-handler";
import { process as processCiList } from "../../server/graph/ci-list-handler";
import { restExecute } from "../acls/index.now";

export const gcmdbApi = RestApi({
  $id: Now.ID["gcmdb-rest-api"],
  name: "Gesture CMDB API",
  serviceId: "gesture_cmdb",
  consumes: "application/json",
  produces: "application/json",
  enforceAcl: [restExecute],
  routes: [
    {
      $id: Now.ID["gcmdb-route-graph"],
      name: "graph",
      path: "/graph",
      method: "GET",
      script: processGraph,
      parameters: [
        { $id: Now.ID["gcmdb-param-root"], name: "root" },
        { $id: Now.ID["gcmdb-param-depth"], name: "depth" },
      ],
    },
    {
      $id: Now.ID["gcmdb-route-ci"],
      name: "ci",
      path: "/ci/{sys_id}",
      method: "GET",
      script: processCi,
    },
    {
      $id: Now.ID["gcmdb-route-cis"],
      name: "cis",
      path: "/cis",
      method: "GET",
      script: processCiList,
    },
  ],
});
