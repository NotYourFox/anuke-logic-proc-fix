function setVar(proc, name, value) {
	if (!proc.exec) return;
	for (var v of proc.exec.vars) {
		if (v.name == name) {
			v.objval = value;
			break;
		}
	}
}

const ops = {

	addline: {
		args: {line: "obj"},

		run(proc, args) {
			if (typeof(args.line) != "string") return;
			proc.updateCode(proc.code + "\n" + args.line);
		}
	},
	
	addcode: {
		args: {code: "obj"},

		run(proc, args) {
			if (typeof(args.code) != "string") return;
			proc.updateCode(proc.code + "\n" + args.code);
		}
	}

}; 

const ProcI = {
	_(builder, op, proc, args) {
		this.op = op;
		this.args = {};

		this.procidx = builder.var(proc);
		this.linksidx = builder.var("@links");

		const opargs = (ops[op] || {}).args;
		if (!opargs) return;

		this.indices = {};
		const argnames = Object.keys(opargs);
		for (var i in argnames) {
			this.indices[argnames[i]] = builder.var(args[i]);
		}
	},

	run(vm) {
		const op = ops[this.op];
		if (!op) return;

		this.processor = vm.building(this.procidx);
		if (!(this.processor instanceof LogicBlock.LogicBuild)) return;

		this.vm = vm;
		for (var arg in op.args || {}) {
			this.args[arg] = vm[op.args[arg]](this.indices[arg]);
		}

		op.run(this.processor, this.args, this);
	}
};

const ProcStatement = {
	new: words => {
		const st = extend(LStatement, Object.create(ProcStatement));
		st.read(words);
		return st;
	},

	read(words) {
		this.op = words[1] || "get";
		this.processor = words[2] || "@this";

		this.args = [];
		for (var i = 3; i < 5; i++) {
			this.args[i - 3] = words[i];
		}
	},

	build(h) {
		if (h instanceof Table) {
			return this.buildt(h);
		}

		const inst = extend(LExecutor.LInstruction, Object.create(ProcI));
		inst._(h, this.op, this.processor, this.args);
		return inst;
	},

	buildt(table) {
		const add = name => {
			this.field(table, this[name], res => {this[name] = res});
		};

		table.add("processor ").left().marginLeft(10);
		add("processor");
		this.row(table);

		/* dropdown for op */
		var opb = table.button(this.op, Styles.logict, () => {
			this.showSelectTable(opb, (t, hide) => {
				for (var op in ops) {
					this.setter(table, t, op, hide);
				}
			});
		}).width(90).color(table.color).get();

		if (!ops[this.op]) return;

		/* Op-specific args */
		const argnames = Object.keys(ops[this.op].args || {});
		for (var i in argnames) {
			const idx = i;
			if (this.args[i] === undefined) {
				this.args[i] = argnames[i];
			}

			var field = this.field(table, this.args[i], arg => {this.args[idx] = arg});

			if (Vars.mobile) {
				if (i == 3) {
					this.row(table);
				} else if (i == 1 && argnames.length > 1) {
					field.colspan(2);
				}
			}
		}
	},

	setter(root, table, op, hide) {
		table.button(op, () => {
			this.op = op;
			root.clearChildren();
			hide.run();
			this.buildt(root);
		}).growX().row();
	},

	write(b) {
		b.append("procfix ");
		b.append(this.op + " ");
		b.append(this.processor);

		for (var i of this.args) {
			if (i !== undefined && i != "undefined") {
				b.append(" " + i);
			}
		}
	},

	name: () => "Proc Fix",
	color: () => Pal.logicBlocks
};

global.anuke.register("procfix", ProcStatement, [
	"procfix",
	"addline",
	"@this",
	"mycode"
]);

module.exports = ProcStatement;
