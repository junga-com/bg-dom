import { Component }   from './component'


export class Tab extends Component {
	constructor(url, label, ...p) {
		super("$div.tab", [
				new Component("contents:$span "+(label||url)),
				new Component("close:$icon close", (e)=>this.onCloseRequest(e)),
			],
			...p,
			{
				ondragstart: (e)=>this.onDragStart(e),
				onclick    : (e)=>this.onClick(e),
				ondragenter: (e)=>this.onDragEnter(e),
				ondragleave: (e)=>this.onDragLeave(e),
				ondrop     : (e)=>this.onDrop(e),
				draggable  : true
			}
		);
		this.label = label;
		this.url   = url;
		this.tabID = parseInt(this.name.replaceAll(/^.*[[]|\].*$/g,""));
	}

	onClick(event) {
		this.parent.selectTab(this);
	}

	onCloseRequest(event) {
		event.stopPropagation();
		this.parent.closeTab(this);
	}

	// this event initiates this tab being dragged to another location
	onDragStart(event) {
		event.dataTransfer.dropEffect = "move";
		event.dataTransfer.setData("tab/url", this.url);
		event.dataTransfer.setData("tab/bar", this.parent.mountedName);
	}

	// these drag events are for when this tab is the drop taget
	// we add the possibleDropTarget class which styles the tab to show that the insertion point is before this tab.
	onDragEnter(event) {
		var targetName = Component.getMountedName(event.target);
		event.stopPropagation();
		this.possibleDropTarget = targetName;
		this.setClass("possibleDropTarget", true);
	}
	onDragLeave(event) {
		var targetName = Component.getMountedName(event.target);
		event.stopPropagation();

		if (targetName === this.possibleDropTarget) {
			delete this.possibleDropTarget;
			this.setClass("possibleDropTarget", false);
		}
	}
	onDrop(event) {
		delete this.possibleDropTarget;
		this.setClass("possibleDropTarget", false);
	}
}
