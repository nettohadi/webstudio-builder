import {
  InstancesList,
  PropsList,
  StyleSourceSelectionsList,
  StyleSourcesList,
  StylesList,
  findTreeInstanceIdsExcludingSlotDescendants,
} from "@webstudio-is/project-build";
import store from "immerhin";
import { removeByMutable } from "./array-utils";
import { isBaseBreakpoint } from "./breakpoints";
import {
  breakpointsStore,
  instancesStore,
  propsStore,
  selectedInstanceSelectorStore,
  selectedStyleSourceSelectorStore,
  styleSourceSelectionsStore,
  styleSourcesStore,
  stylesStore,
  textEditingInstanceSelectorStore,
} from "./nano-states";
import {
  createComponentInstance,
  findSubtreeLocalStyleSources,
  getAncestorInstanceSelector,
  insertInstancesMutable,
  insertPropsCopyMutable,
  insertStyleSourceSelectionsCopyMutable,
  insertStyleSourcesCopyMutable,
  insertStylesCopyMutable,
  reparentInstanceMutable,
  type DroppableTarget,
  type InstanceSelector,
} from "./tree-utils";

export const insertNewComponentInstance = (
  component: string,
  dropTarget: DroppableTarget
) => {
  const breakpoints = breakpointsStore.get();
  const breakpointValues = Array.from(breakpoints.values());
  const baseBreakpoint = breakpointValues.find(isBaseBreakpoint);
  if (baseBreakpoint === undefined) {
    return;
  }
  const { instances, props, styleSourceSelections, styleSources, styles } =
    createComponentInstance(component, baseBreakpoint.id);

  insertInstances(
    instances,
    props,
    styleSourceSelections,
    styleSources,
    styles,
    dropTarget
  );
};

export const insertInstances = (
  instances: InstancesList,
  props: PropsList,
  styleSourceSelections: StyleSourceSelectionsList,
  styleSources: StyleSourcesList,
  styles: StylesList,
  dropTarget: DroppableTarget
) => {
  const rootInstanceId = instances[0].id;
  store.createTransaction(
    [
      instancesStore,
      propsStore,
      styleSourceSelectionsStore,
      styleSourcesStore,
      stylesStore,
    ],
    (
      existingInstances,
      existingProps,
      existingStyleSourceSelections,
      existingStyleSources,
      existingStyles
    ) => {
      insertInstancesMutable(
        existingInstances,
        instances,
        [rootInstanceId],
        dropTarget
      );
      insertPropsCopyMutable(existingProps, props, new Map());
      insertStyleSourcesCopyMutable(
        existingStyleSources,
        styleSources,
        new Set()
      );
      insertStyleSourceSelectionsCopyMutable(
        existingStyleSourceSelections,
        styleSourceSelections,
        new Map(),
        new Map()
      );
      insertStylesCopyMutable(existingStyles, styles, new Map(), new Map());
    }
  );

  selectedInstanceSelectorStore.set([
    rootInstanceId,
    ...dropTarget.parentSelector,
  ]);
  selectedStyleSourceSelectorStore.set(undefined);
};

export const reparentInstance = (
  targetInstanceSelector: InstanceSelector,
  dropTarget: DroppableTarget
) => {
  store.createTransaction([instancesStore], (instances) => {
    reparentInstanceMutable(instances, targetInstanceSelector, dropTarget);
  });
  selectedInstanceSelectorStore.set(targetInstanceSelector);
  selectedStyleSourceSelectorStore.set(undefined);
};

export const deleteInstance = (instanceSelector: InstanceSelector) => {
  store.createTransaction(
    [
      instancesStore,
      propsStore,
      styleSourceSelectionsStore,
      styleSourcesStore,
      stylesStore,
    ],
    (instances, props, styleSourceSelections, styleSources, styles) => {
      let targetInstanceId = instanceSelector[0];
      const parentInstanceId = instanceSelector[1];
      const grandparentInstanceId = instanceSelector[2];
      let parentInstance =
        parentInstanceId === undefined
          ? undefined
          : instances.get(parentInstanceId);

      // delete parent fragment too if its last child is going to be deleted
      // use case for slots: slot became empty and remove display: contents
      // to be displayed properly on canvas
      if (
        parentInstance?.component === "Fragment" &&
        parentInstance.children.length === 1 &&
        grandparentInstanceId !== undefined
      ) {
        targetInstanceId = parentInstance.id;
        parentInstance = instances.get(grandparentInstanceId);
      }

      const subtreeIds = findTreeInstanceIdsExcludingSlotDescendants(
        instances,
        targetInstanceId
      );
      const subtreeLocalStyleSourceIds = findSubtreeLocalStyleSources(
        subtreeIds,
        styleSources,
        styleSourceSelections
      );

      // may not exist when delete root
      if (parentInstance) {
        removeByMutable(
          parentInstance.children,
          (child) => child.type === "id" && child.value === targetInstanceId
        );
      }

      for (const instanceId of subtreeIds) {
        instances.delete(instanceId);
      }
      // delete props and styles of deleted instance and its descendants
      for (const prop of props.values()) {
        if (subtreeIds.has(prop.instanceId)) {
          props.delete(prop.id);
        }
      }
      for (const instanceId of subtreeIds) {
        styleSourceSelections.delete(instanceId);
      }
      for (const styleSourceId of subtreeLocalStyleSourceIds) {
        styleSources.delete(styleSourceId);
      }
      for (const [styleDeclKey, styleDecl] of styles) {
        if (subtreeLocalStyleSourceIds.has(styleDecl.styleSourceId)) {
          styles.delete(styleDeclKey);
        }
      }

      if (parentInstance) {
        selectedInstanceSelectorStore.set(
          getAncestorInstanceSelector(instanceSelector, parentInstance.id)
        );
        selectedStyleSourceSelectorStore.set(undefined);
      }
    }
  );
};

export const deleteSelectedInstance = () => {
  const selectedInstanceSelector = selectedInstanceSelectorStore.get();
  // @todo tell user they can't delete root
  if (
    selectedInstanceSelector === undefined ||
    selectedInstanceSelector.length === 1
  ) {
    return;
  }
  deleteInstance(selectedInstanceSelector);
};

export const escapeSelection = () => {
  const selectedInstanceSelector = selectedInstanceSelectorStore.get();
  const textEditingInstanceSelector = textEditingInstanceSelectorStore.get();
  if (selectedInstanceSelector === undefined) {
    return;
  }
  // exit text editing mode first without unselecting instance
  if (textEditingInstanceSelector) {
    textEditingInstanceSelectorStore.set(undefined);
    return;
  }
  selectedInstanceSelectorStore.set(undefined);
  selectedStyleSourceSelectorStore.set(undefined);
};
