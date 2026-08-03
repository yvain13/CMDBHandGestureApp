import "@servicenow/sdk/global";
import { RestApi } from "@servicenow/sdk/core";
import { process as processGraph } from "../../server/graph/graph-handler";
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
  ],
});
