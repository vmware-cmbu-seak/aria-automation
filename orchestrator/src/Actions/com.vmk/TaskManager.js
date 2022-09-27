return {
    _config: function () {
        var workflow = Server.getWorkflowWithId(workflowId);
        if (workflow == null) { throw "Error [TaskManager] : could not find workflow"; }
        return {
            workflow: workflow,
            tasks: [],
            timeout: 3600
        }
    } (),
    exec: function (parameters) {
        this._config.tasks.push(this._config.workflow.execute(new Properties(parameters)));
        return this;
    },
    sched: function (parameters, delayedSec) {
        var date = new Date();
        date.setTime(date.getTime() + (delayedSec * 1000));
        this._config.workflow.schedule(new Properties(parameters), date);
        return this;
    },
    join: function () {
        var try_cnt = 0;
        var results = [];
        for each(var task in this._config.tasks) {
            for (; try_cnt <= this._config.timeout; try_cnt++) {
                if (Server.getWorkflowTokenState(task.id) == "completed") {
                    results.push(task.getOutputParameters());
                    break;
                }
                System.sleep(1000);
            }
            if (try_cnt == this._config.timeout) { throw "Error [TaskManager.join()] : workflow execution timeout"; }
        }
        this._config.tasks = [];
        return results;
    },
    result: function() {
        var try_cnt = 0;
        if (this._config.tasks.length > 0) {
            var task = this._config.tasks.shift();
            for (; try_cnt <= this._config.timeout; try_cnt++) {
                if (Server.getWorkflowTokenState(task.id) == "completed") { return task.getOutputParameters(); }
                System.sleep(1000);
            }
            if (try_cnt == this._config.timeout) { throw "Error [TaskManager.result()] : workflow execution timeout"; }
        }
        return null;
    }
}